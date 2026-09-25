import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { Locale } from '../../../common/enums/locale.enum';
import { conflict, validationFailed } from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { Page } from '../../pages/entities/page.entity';
import { PageStatus } from '../../pages/constants/page-status';
import { NavigationLinkType } from '../constants/navigation-link-type';
import { ReplaceNavigationDto } from '../dto/replace-navigation.dto';
import {
  AdminNavigationItemDto,
  AdminNavigationMenuDto,
  PublicNavigationItemDto,
  PublicNavigationMenuDto,
} from '../dto/navigation-response.dto';
import { NavigationItemTranslation } from '../entities/navigation-item-translation.entity';
import { NavigationItem } from '../entities/navigation-item.entity';
import { NavigationMenu } from '../entities/navigation-menu.entity';
import { flattenNavigationTree, MENU_KEY_PATTERN } from '../utils/navigation-tree';
import { notFound } from '../../../common/exceptions/exception.factories';

interface LoadedMenu {
  menu: NavigationMenu;
  items: NavigationItem[];
  labels: Map<string, Partial<Record<string, string>>>;
}

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationMenu) private readonly menus: Repository<NavigationMenu>,
    @InjectRepository(NavigationItem) private readonly items: Repository<NavigationItem>,
    @InjectRepository(NavigationItemTranslation)
    private readonly translations: Repository<NavigationItemTranslation>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listMenuKeys(): Promise<{ key: string; version: number }[]> {
    const rows = await this.menus.find({ order: { key: 'ASC' } });
    return rows.map((row) => ({ key: row.key, version: row.version }));
  }

  async getAdminMenu(menuKey: string): Promise<AdminNavigationMenuDto> {
    this.assertValidKey(menuKey);
    const loaded = await this.load(menuKey);
    if (!loaded) return { key: menuKey, version: 0, items: [] };
    const pageIds = loaded.items.map((item) => item.pageId).filter((id): id is string => !!id);
    const pages = await this.loadPages(pageIds);
    const nodes = new Map<string, AdminNavigationItemDto>();
    for (const item of loaded.items) {
      const page = item.pageId ? pages.get(item.pageId) : undefined;
      const labels = loaded.labels.get(item.id) ?? {};
      nodes.set(item.id, {
        id: item.id,
        linkType: item.linkType,
        pageId: item.pageId,
        pagePath: page?.path ?? null,
        url: item.url,
        openInNewTab: item.openInNewTab,
        isVisible: item.isVisible,
        isFeatured: item.isFeatured,
        translations: Object.fromEntries(
          Object.entries(labels).map(([locale, label]) => [locale, { label: label ?? '' }]),
        ),
        children: [],
      });
    }
    return {
      key: loaded.menu.key,
      version: loaded.menu.version,
      items: this.assemble(loaded.items, nodes),
    };
  }

  async replaceMenu(menuKey: string, dto: ReplaceNavigationDto): Promise<AdminNavigationMenuDto> {
    this.assertValidKey(menuKey);
    const { nodes, errors } = flattenNavigationTree(dto.items);
    if (errors.length > 0) throw validationFailed(errors);

    const pageIds = [
      ...new Set(nodes.map((node) => node.input.pageId).filter((id): id is string => !!id)),
    ];
    if (pageIds.length > 0) {
      const found = await this.pages.find({ select: { id: true }, where: { id: In(pageIds) } });
      const foundIds = new Set(found.map((page) => page.id));
      const missing = pageIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw validationFailed([
          { field: 'items.pageId', messages: [`Unknown pages: ${missing.join(', ')}`] },
        ]);
      }
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const menuRepository = manager.getRepository(NavigationMenu);
        let menu = await menuRepository.findOne({
          where: { key: menuKey },
          lock: { mode: 'pessimistic_write' },
        });
        if (menu) {
          assertVersionMatches(menu.version, dto.version);
        } else {
          assertVersionMatches(0, dto.version);
          menu = await menuRepository.save(menuRepository.create({ key: menuKey }));
        }

        const existing = await manager.find(NavigationItem, {
          select: { id: true },
          where: { menuId: menu.id },
        });
        const previousIds = new Set(existing.map((item) => item.id));
        await manager.delete(NavigationItem, { menuId: menu.id });

        const ids = nodes.map((node) =>
          node.input.id && previousIds.has(node.input.id) ? node.input.id : randomUUID(),
        );
        const itemEntities = nodes.map((node, index) =>
          manager.create(NavigationItem, {
            id: ids[index],
            menuId: menu.id,
            parentId: node.parentIndex === null ? null : ids[node.parentIndex],
            sortOrder: node.sortOrder,
            linkType: node.input.linkType,
            pageId:
              node.input.linkType === NavigationLinkType.PAGE ? (node.input.pageId ?? null) : null,
            url:
              node.input.linkType === NavigationLinkType.EXTERNAL ||
              node.input.linkType === NavigationLinkType.PATH
                ? (node.input.url ?? null)
                : null,
            openInNewTab: node.input.openInNewTab ?? false,
            isVisible: node.input.isVisible ?? true,
            isFeatured: node.input.isFeatured ?? false,
          }),
        );
        await manager.save(NavigationItem, itemEntities, { chunk: 100 });

        const translationEntities = nodes.flatMap((node, index) =>
          [Locale.VI, Locale.EN].map((locale) =>
            manager.create(NavigationItemTranslation, {
              itemId: ids[index],
              locale,
              label: node.input.translations[locale].label.trim(),
            }),
          ),
        );
        await manager.save(NavigationItemTranslation, translationEntities, { chunk: 200 });
        // Touch the menu so its version changes even when only items changed
        await manager.update(NavigationMenu, { id: menu.id }, { updatedAt: new Date() });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(ErrorCode.VERSION_CONFLICT, 'This menu was saved by someone else', {
          expectedVersion: dto.version,
        });
      }
      throw error;
    }
    return this.getAdminMenu(menuKey);
  }

  async getPublicMenu(menuKey: string, locale: Locale): Promise<PublicNavigationMenuDto> {
    this.assertValidKey(menuKey, true);
    const loaded = await this.load(menuKey);
    if (!loaded) throw notFound('Menu');
    const pageIds = loaded.items.map((item) => item.pageId).filter((id): id is string => !!id);
    const pages = await this.loadPages(pageIds);

    const nodes = new Map<string, PublicNavigationItemDto>();
    const visibleItems: NavigationItem[] = [];
    for (const item of loaded.items) {
      if (!item.isVisible) continue;
      let href: string | null = null;
      if (item.linkType === NavigationLinkType.PAGE) {
        const page = item.pageId ? pages.get(item.pageId) : undefined;
        if (!page || page.status !== PageStatus.PUBLISHED) continue;
        href = page.path;
      } else if (item.linkType !== NavigationLinkType.NONE) {
        href = item.url;
      }
      const labels = loaded.labels.get(item.id) ?? {};
      nodes.set(item.id, {
        id: item.id,
        label: labels[locale] ?? labels[Locale.VI] ?? '',
        href,
        openInNewTab: item.openInNewTab,
        isFeatured: item.isFeatured,
        children: [],
      });
      visibleItems.push(item);
    }
    const tree = this.assemble(visibleItems, nodes);
    // A heading without a link and without children leads nowhere
    const prune = (list: PublicNavigationItemDto[]): PublicNavigationItemDto[] =>
      list
        .map((node) => ({ ...node, children: prune(node.children) }))
        .filter((node) => node.href !== null || node.children.length > 0);
    return { key: menuKey, items: prune(tree) };
  }

  private assemble<T extends { children: T[] }>(
    items: NavigationItem[],
    nodes: Map<string, T>,
  ): T[] {
    const roots: T[] = [];
    for (const item of items) {
      const node = nodes.get(item.id);
      if (!node) continue;
      const parent = item.parentId ? nodes.get(item.parentId) : undefined;
      // An item whose parent was filtered out disappears with it
      if (item.parentId && !parent) continue;
      (parent ? parent.children : roots).push(node);
    }
    return roots;
  }

  private async load(menuKey: string): Promise<LoadedMenu | null> {
    const menu = await this.menus.findOne({ where: { key: menuKey } });
    if (!menu) return null;
    const items = await this.items.find({
      where: { menuId: menu.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const translations = items.length
      ? await this.translations.find({ where: { itemId: In(items.map((item) => item.id)) } })
      : [];
    const labels = new Map<string, Partial<Record<string, string>>>();
    for (const translation of translations) {
      const entry = labels.get(translation.itemId) ?? {};
      entry[translation.locale] = translation.label;
      labels.set(translation.itemId, entry);
    }
    return { menu, items, labels };
  }

  private async loadPages(ids: string[]): Promise<Map<string, Page>> {
    if (ids.length === 0) return new Map();
    const pages = await this.pages.find({ where: { id: In([...new Set(ids)]) } });
    return new Map(pages.map((page) => [page.id, page]));
  }

  private assertValidKey(menuKey: string, asNotFound = false): void {
    if (menuKey.length <= 60 && MENU_KEY_PATTERN.test(menuKey)) return;
    if (asNotFound) throw notFound('Menu');
    throw validationFailed([
      { field: 'menuKey', messages: ['menuKey must be lowercase kebab-case'] },
    ]);
  }
}
