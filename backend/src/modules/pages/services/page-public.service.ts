import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { PageStatus } from '../constants/page-status';
import { getSectionTypeDefinition } from '../constants/section-types.registry';
import { PublicPageDto, PublicPageRouteDto } from '../dto/page-responses.dto';
import { PageSection, SectionContent } from '../entities/page-section.entity';
import { PageTranslation } from '../entities/page-translation.entity';
import { Page } from '../entities/page.entity';
import { normalizeLookupPath } from '../utils/page-path';
import { collectContentMediaIds, resolveSectionContent } from '../utils/section-content.resolver';
import { PageMediaResolverService } from './page-media-resolver.service';

const MAX_ROUTES = 2000;

@Injectable()
export class PagePublicService {
  constructor(
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PageTranslation) private readonly translations: Repository<PageTranslation>,
    @InjectRepository(PageSection) private readonly sections: Repository<PageSection>,
    private readonly mediaResolver: PageMediaResolverService,
  ) {}

  async listRoutes(): Promise<PublicPageRouteDto[]> {
    const pages = await this.pages.find({
      select: { id: true, path: true, templateKey: true, updatedAt: true },
      where: { status: PageStatus.PUBLISHED },
      order: { path: 'ASC' },
      take: MAX_ROUTES,
    });
    return pages.map((page) => ({
      path: page.path,
      templateKey: page.templateKey,
      updatedAt: page.updatedAt,
    }));
  }

  async getByPath(path: string, locale: Locale): Promise<PublicPageDto> {
    const page = await this.pages.findOne({
      where: { path: normalizeLookupPath(path), status: PageStatus.PUBLISHED },
    });
    if (!page) throw notFound('Page');
    return this.render(page, locale, 'published');
  }

  async preview(pageId: string, locale: Locale): Promise<PublicPageDto> {
    const page = await this.pages.findOne({ where: { id: pageId } });
    if (!page) throw notFound('Page');
    return this.render(page, locale, 'draft');
  }

  private async render(
    page: Page,
    locale: Locale,
    mode: 'published' | 'draft',
  ): Promise<PublicPageDto> {
    const [translations, sections] = await Promise.all([
      this.translations.find({ where: { pageId: page.id } }),
      this.sections.find({
        where: { pageId: page.id, isVisible: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
    ]);
    const visible: { section: PageSection; content: SectionContent }[] = [];
    for (const section of sections) {
      const content = mode === 'draft' ? section.draftContent : section.publishedContent;
      if (content) visible.push({ section, content });
    }

    const localized = translations.find((row) => row.locale === locale);
    const fallback = translations.find((row) => row.locale === DEFAULT_LOCALE);
    const pick = <K extends keyof PageTranslation>(key: K): PageTranslation[K] | null =>
      localized?.[key] ?? fallback?.[key] ?? null;
    const ogImageId = localized?.ogImageId ?? fallback?.ogImageId ?? null;

    const mediaIds = visible.flatMap(({ section, content }) => {
      const definition = getSectionTypeDefinition(section.type);
      return definition ? collectContentMediaIds(definition, content) : [];
    });
    if (ogImageId) mediaIds.push(ogImageId);
    const media = await this.mediaResolver.resolve(mediaIds);

    const ogFile = ogImageId ? media.get(ogImageId) : undefined;
    const title = pick('title');
    return {
      path: page.path,
      templateKey: page.templateKey,
      locale,
      title,
      seo: {
        title: pick('seoTitle') ?? title,
        description: pick('seoDescription'),
        keywords: pick('seoKeywords'),
        canonicalUrl: pick('canonicalUrl'),
        noIndex: localized?.noIndex ?? fallback?.noIndex ?? false,
        ogImage: ogFile ? { ...ogFile, alt: title } : null,
      },
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      sections: visible.flatMap(({ section, content }) => {
        const definition = getSectionTypeDefinition(section.type);
        if (!definition) return [];
        return [
          {
            key: section.sectionKey,
            type: section.type,
            content: resolveSectionContent(definition, content, locale, media),
          },
        ];
      }),
    };
  }
}
