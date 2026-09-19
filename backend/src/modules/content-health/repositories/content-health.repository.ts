import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { ContactStatus, Contact } from '../../contacts/entities/contact.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { NavigationMenu } from '../../navigation/entities/navigation-menu.entity';
import { PageStatus } from '../../pages/constants/page-status';
import { Page } from '../../pages/entities/page.entity';
import { Post } from '../../posts/entities/post.entity';
import { Product } from '../../products/entities/product.entity';
import { Project } from '../../projects/entities/project.entity';
import { ServiceCategory } from '../../service-catalog/entities/service-category.entity';
import { SiteSetting } from '../../settings/entities/site-setting.entity';
import { Testimonial, TestimonialStatus } from '../../testimonials/entities/testimonial.entity';
import {
  ISSUE_SAMPLE_SIZE,
  NEW_CONTACT_OVERDUE_HOURS,
  REQUIRED_NAVIGATION_MENU_KEYS,
  REQUIRED_SETTING_GROUP,
  REVIEW_WAITING_DAYS,
  STALE_DRAFT_DAYS,
} from '../constants/content-health.constants';
import { IssueSeverity, PublishedCountsDto } from '../dto/content-health-response.dto';

export interface IssueSample {
  count: number;
  ids: string[];
}

export interface IssueFinding extends IssueSample {
  code: string;
  severity: IssueSeverity;
  entity: string;
}

interface IssueCheck {
  code: string;
  severity: IssueSeverity;
  entity: string;
  find: () => Promise<IssueSample>;
}

interface TranslatedContentDefinition {
  prefix: string;
  entity: string;
  target: EntityTarget<ObjectLiteral>;
  translationTable: string;
  foreignKey: string;
  requiredTextColumn: string;
  coverProperty: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const TRANSLATED_CONTENT: TranslatedContentDefinition[] = [
  {
    prefix: 'posts',
    entity: 'Post',
    target: Post,
    translationTable: 'post_translations',
    foreignKey: 'post_id',
    requiredTextColumn: 'title',
    coverProperty: 'coverImageId',
  },
  {
    prefix: 'products',
    entity: 'Product',
    target: Product,
    translationTable: 'product_translations',
    foreignKey: 'product_id',
    requiredTextColumn: 'name',
    coverProperty: 'coverImageId',
  },
  {
    prefix: 'projects',
    entity: 'Project',
    target: Project,
    translationTable: 'project_translations',
    foreignKey: 'project_id',
    requiredTextColumn: 'title',
    coverProperty: 'thumbnailId',
  },
  {
    prefix: 'services',
    entity: 'ServiceCategory',
    target: ServiceCategory,
    translationTable: 'service_category_translations',
    foreignKey: 'category_id',
    requiredTextColumn: 'title',
    coverProperty: 'coverImageId',
  },
];

@Injectable()
export class ContentHealthRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Items the public site can actually show right now (scheduled posts and products are not counted)
  async countPublished(): Promise<PublishedCountsDto> {
    const published = { published: PublicationStatus.PUBLISHED };
    const [posts, products, projects, services, testimonials] = await Promise.all([
      this.query(Post)
        .where('item.status = :published', published)
        .andWhere('item.publishedAt IS NOT NULL AND item.publishedAt <= now()')
        .getCount(),
      this.query(Product)
        .where('item.status = :published', published)
        .andWhere('item.publishedAt IS NOT NULL AND item.publishedAt <= now()')
        .getCount(),
      this.query(Project).where('item.status = :published', published).getCount(),
      this.query(ServiceCategory).where('item.status = :published', published).getCount(),
      this.query(Testimonial)
        .where('item.status = :status', { status: TestimonialStatus.PUBLISHED })
        .getCount(),
    ]);
    return { posts, products, projects, services, testimonials };
  }

  async findIssues(now: Date = new Date()): Promise<IssueFinding[]> {
    const checks = [
      ...this.editorialChecks(now),
      this.productWithoutPriceCheck(),
      ...this.pageChecks(),
      this.contactCheck(now),
      this.mediaCheck(),
    ];
    const [sampled, configuration] = await Promise.all([
      Promise.all(checks.map(async (check) => ({ check, sample: await check.find() }))),
      this.configurationFindings(),
    ]);
    const findings = sampled.map(({ check, sample }) => ({
      code: check.code,
      severity: check.severity,
      entity: check.entity,
      count: sample.count,
      ids: sample.ids,
    }));
    return [...findings, ...configuration].filter((finding) => finding.count > 0);
  }

  private editorialChecks(now: Date): IssueCheck[] {
    const draftCutoff = new Date(now.getTime() - STALE_DRAFT_DAYS * DAY_MS);
    const reviewCutoff = new Date(now.getTime() - REVIEW_WAITING_DAYS * DAY_MS);
    return TRANSLATED_CONTENT.flatMap((definition) => [
      {
        code: `${definition.prefix}.published_missing_translation`,
        severity: IssueSeverity.CRITICAL,
        entity: definition.entity,
        find: () =>
          this.sample(
            this.query(definition.target)
              .where('item.status = :published', { published: PublicationStatus.PUBLISHED })
              .andWhere(
                `(SELECT COUNT(DISTINCT t.locale) FROM ${definition.translationTable} t
                  WHERE t.${definition.foreignKey} = item.id
                    AND t.locale IN (:...locales)
                    AND btrim(t.${definition.requiredTextColumn}) <> '') < :localeCount`,
                { locales: SUPPORTED_LOCALES as Locale[], localeCount: SUPPORTED_LOCALES.length },
              ),
          ),
      },
      {
        code: `${definition.prefix}.stale_drafts`,
        severity: IssueSeverity.INFO,
        entity: definition.entity,
        find: () =>
          this.sample(
            this.query(definition.target)
              .where('item.status = :draft', { draft: PublicationStatus.DRAFT })
              .andWhere('item.updatedAt < :draftCutoff', { draftCutoff }),
          ),
      },
      {
        code: `${definition.prefix}.review_waiting`,
        severity: IssueSeverity.WARNING,
        entity: definition.entity,
        find: () =>
          this.sample(
            this.query(definition.target)
              .where('item.status = :inReview', { inReview: PublicationStatus.IN_REVIEW })
              .andWhere('item.updatedAt < :reviewCutoff', { reviewCutoff }),
          ),
      },
      {
        code: `${definition.prefix}.published_without_cover`,
        severity: IssueSeverity.WARNING,
        entity: definition.entity,
        find: () =>
          this.sample(
            this.query(definition.target)
              .where('item.status = :published', { published: PublicationStatus.PUBLISHED })
              .andWhere(`item.${definition.coverProperty} IS NULL`),
          ),
      },
    ]);
  }

  private productWithoutPriceCheck(): IssueCheck {
    return {
      code: 'products.published_without_price',
      severity: IssueSeverity.WARNING,
      entity: 'Product',
      find: () =>
        this.sample(
          this.query(Product)
            .where('item.status = :published', { published: PublicationStatus.PUBLISHED })
            .andWhere('item.priceOnRequest = false')
            .andWhere('NOT EXISTS (SELECT 1 FROM product_prices pp WHERE pp.product_id = item.id)'),
        ),
    };
  }

  private pageChecks(): IssueCheck[] {
    return [
      {
        code: 'pages.no_visible_section',
        severity: IssueSeverity.WARNING,
        entity: 'Page',
        find: () =>
          this.sample(
            this.query(Page).where(
              `NOT EXISTS (SELECT 1 FROM page_sections s
                WHERE s.page_id = item.id AND s.is_visible = true AND s.deleted_at IS NULL)`,
            ),
          ),
      },
      {
        code: 'pages.not_published',
        severity: IssueSeverity.WARNING,
        entity: 'Page',
        find: () =>
          this.sample(
            this.query(Page).where('item.status <> :published', {
              published: PageStatus.PUBLISHED,
            }),
          ),
      },
    ];
  }

  private contactCheck(now: Date): IssueCheck {
    const cutoff = new Date(now.getTime() - NEW_CONTACT_OVERDUE_HOURS * HOUR_MS);
    return {
      code: 'contacts.new_overdue',
      severity: IssueSeverity.WARNING,
      entity: 'Contact',
      find: () =>
        this.sample(
          this.query(Contact)
            .where('item.status = :status', { status: ContactStatus.NEW })
            .andWhere('item.isSpam = false')
            .andWhere('item.createdAt < :cutoff', { cutoff }),
        ),
    };
  }

  private mediaCheck(): IssueCheck {
    return {
      code: 'media.missing_alt_text',
      severity: IssueSeverity.INFO,
      entity: 'MediaAsset',
      find: () =>
        this.sample(
          this.query(MediaAsset)
            .where(`item.mimeType LIKE 'image/%'`)
            .andWhere(
              `NOT EXISTS (SELECT 1 FROM media_asset_translations t
                WHERE t.media_asset_id = item.id AND btrim(coalesce(t.alt_text, '')) <> '')`,
            ),
        ),
    };
  }

  private async configurationFindings(): Promise<IssueFinding[]> {
    const [menus, companySetting] = await Promise.all([
      this.dataSource.getRepository(NavigationMenu).find({ select: { key: true } }),
      this.dataSource
        .getRepository(SiteSetting)
        .count({ where: { group: REQUIRED_SETTING_GROUP } }),
    ]);
    const existingKeys = new Set(menus.map((menu) => menu.key));
    const findings: IssueFinding[] = REQUIRED_NAVIGATION_MENU_KEYS.filter(
      (key) => !existingKeys.has(key),
    ).map((key) => ({
      code: `navigation.${key}_missing`,
      severity: IssueSeverity.WARNING,
      entity: 'NavigationMenu',
      count: 1,
      ids: [],
    }));
    if (companySetting === 0) {
      findings.push({
        code: 'settings.company_missing',
        severity: IssueSeverity.WARNING,
        entity: 'SiteSetting',
        count: 1,
        ids: [],
      });
    }
    return findings;
  }

  private query(target: EntityTarget<ObjectLiteral>): SelectQueryBuilder<ObjectLiteral> {
    return this.dataSource.getRepository(target).createQueryBuilder('item');
  }

  // One round trip yields both the full count (window function) and the sample ids
  private async sample(builder: SelectQueryBuilder<ObjectLiteral>): Promise<IssueSample> {
    const rows = await builder
      .select('item.id', 'id')
      .addSelect('COUNT(*) OVER()', 'total')
      .orderBy('item.createdAt', 'ASC')
      .addOrderBy('item.id', 'ASC')
      .limit(ISSUE_SAMPLE_SIZE)
      .getRawMany<{ id: string; total: string }>();
    return { count: rows.length === 0 ? 0 : Number(rows[0].total), ids: rows.map((row) => row.id) };
  }
}
