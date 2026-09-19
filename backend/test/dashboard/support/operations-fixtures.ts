import { randomUUID } from 'node:crypto';
import { DataSource, DeepPartial, ObjectLiteral } from 'typeorm';
import { Locale } from '../../../src/common/enums/locale.enum';
import { PublicationStatus } from '../../../src/common/enums/publication-status.enum';
import { Role } from '../../../src/common/enums/role.enum';
import { AuditLogEntry } from '../../../src/modules/audit-log/entities/audit-log-entry.entity';
import { ClientLocationTranslation } from '../../../src/modules/client-locations/entities/client-location-translation.entity';
import {
  ClientLocation,
  ClientLocationStatus,
} from '../../../src/modules/client-locations/entities/client-location.entity';
import { Contact, ContactStatus } from '../../../src/modules/contacts/entities/contact.entity';
import { MediaAssetTranslation } from '../../../src/modules/media/entities/media-asset-translation.entity';
import { MediaAsset } from '../../../src/modules/media/entities/media-asset.entity';
import { NavigationMenu } from '../../../src/modules/navigation/entities/navigation-menu.entity';
import { PageStatus } from '../../../src/modules/pages/constants/page-status';
import { PageSection } from '../../../src/modules/pages/entities/page-section.entity';
import { PageTranslation } from '../../../src/modules/pages/entities/page-translation.entity';
import { Page } from '../../../src/modules/pages/entities/page.entity';
import { PostCategoryTranslation } from '../../../src/modules/posts/entities/post-category-translation.entity';
import { PostCategory } from '../../../src/modules/posts/entities/post-category.entity';
import { PostTranslation } from '../../../src/modules/posts/entities/post-translation.entity';
import { Post } from '../../../src/modules/posts/entities/post.entity';
import { ProductCategoryTranslation } from '../../../src/modules/products/entities/product-category-translation.entity';
import { ProductCategory } from '../../../src/modules/products/entities/product-category.entity';
import { ProductImage } from '../../../src/modules/products/entities/product-image.entity';
import { ProductPrice } from '../../../src/modules/products/entities/product-price.entity';
import { ProductTranslation } from '../../../src/modules/products/entities/product-translation.entity';
import { Product } from '../../../src/modules/products/entities/product.entity';
import { BillingPeriod } from '../../../src/modules/products/enums/billing-period.enum';
import { Currency } from '../../../src/modules/products/enums/currency.enum';
import { ProductType } from '../../../src/modules/products/enums/product-type.enum';
import { ProjectCategoryTranslation } from '../../../src/modules/projects/entities/project-category-translation.entity';
import { ProjectCategory } from '../../../src/modules/projects/entities/project-category.entity';
import { ProjectTranslation } from '../../../src/modules/projects/entities/project-translation.entity';
import { Project } from '../../../src/modules/projects/entities/project.entity';
import { ServiceCategoryTranslation } from '../../../src/modules/service-catalog/entities/service-category-translation.entity';
import { ServiceCategory } from '../../../src/modules/service-catalog/entities/service-category.entity';
import { SiteSetting } from '../../../src/modules/settings/entities/site-setting.entity';
import { TestimonialTranslation } from '../../../src/modules/testimonials/entities/testimonial-translation.entity';
import {
  Testimonial,
  TestimonialStatus,
} from '../../../src/modules/testimonials/entities/testimonial.entity';
import { User } from '../../../src/modules/users/entities/user.entity';
import { asTestUser, TestUser } from '../../support/test-authentication.guard';

// Every table the operations modules read, including the ones only needed for schema relations
export const OPERATIONS_ENTITIES = [
  MediaAsset,
  MediaAssetTranslation,
  User,
  AuditLogEntry,
  Post,
  PostTranslation,
  PostCategory,
  PostCategoryTranslation,
  Product,
  ProductTranslation,
  ProductPrice,
  ProductImage,
  ProductCategory,
  ProductCategoryTranslation,
  Project,
  ProjectTranslation,
  ProjectCategory,
  ProjectCategoryTranslation,
  ServiceCategory,
  ServiceCategoryTranslation,
  Testimonial,
  TestimonialTranslation,
  ClientLocation,
  ClientLocationTranslation,
  Page,
  PageTranslation,
  PageSection,
  NavigationMenu,
  SiteSetting,
  Contact,
];

export const TEST_USERS = {
  owner: { id: '00000000-0000-4000-8000-0000000000f1', role: Role.OWNER },
  admin: { id: '00000000-0000-4000-8000-0000000000a1', role: Role.ADMIN },
  staff: { id: '00000000-0000-4000-8000-0000000000b1', role: Role.STAFF },
  otherStaff: { id: '00000000-0000-4000-8000-0000000000b2', role: Role.STAFF },
  customer: { id: '00000000-0000-4000-8000-0000000000c1', role: Role.CUSTOMER },
} satisfies Record<string, TestUser>;

export const as = (user: TestUser): Record<string, string> => asTestUser(user);

export const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
export const hoursAgo = (hours: number): Date => new Date(Date.now() - hours * 60 * 60 * 1000);
export const daysFromNow = (days: number): Date =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

let sequence = 0;
const next = (): number => {
  sequence += 1;
  return sequence;
};

export interface BilingualText {
  vi?: string;
  en?: string;
}

const LOCALES: Locale[] = [Locale.VI, Locale.EN];

async function insert<T extends ObjectLiteral>(
  dataSource: DataSource,
  entity: new () => T,
  values: DeepPartial<T>,
): Promise<T> {
  const repository = dataSource.getRepository(entity);
  return repository.save(repository.create(values));
}

// Timestamps are set with an update so the audit subscriber and defaults cannot interfere
export async function backdate(
  dataSource: DataSource,
  entity: new () => ObjectLiteral,
  id: string,
  values: { createdAt?: Date; updatedAt?: Date },
): Promise<void> {
  await dataSource
    .createQueryBuilder()
    .update(entity)
    .set(values)
    .where('id = :id', { id })
    .execute();
}

export async function softDelete(
  dataSource: DataSource,
  entity: new () => ObjectLiteral,
  id: string,
): Promise<void> {
  await dataSource.getRepository(entity).softDelete(id);
}

export async function seedMedia(
  dataSource: DataSource,
  options: {
    originalName?: string;
    displayName?: string | null;
    mimeType?: string;
    altText?: BilingualText;
    deleted?: boolean;
  } = {},
): Promise<MediaAsset> {
  const n = next();
  const repository = dataSource.getRepository(MediaAsset);
  const asset = await repository.save(
    repository.create({
      originalName: options.originalName ?? `image-${n}.jpg`,
      displayName: options.displayName ?? null,
      storageKey: `test/operations/${n}-${randomUUID()}.jpg`,
      mimeType: options.mimeType ?? 'image/jpeg',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    }),
  );
  const alt = options.altText ?? {};
  for (const locale of LOCALES) {
    if (alt[locale] === undefined) continue;
    await insert(dataSource, MediaAssetTranslation, {
      mediaAssetId: asset.id,
      locale,
      altText: alt[locale],
      caption: null,
    });
  }
  if (options.deleted) await softDelete(dataSource, MediaAsset, asset.id);
  return asset;
}

interface EditorialOptions {
  status?: PublicationStatus;
  publishedAt?: Date | null;
  createdById?: string | null;
  deleted?: boolean;
}

export async function seedPost(
  dataSource: DataSource,
  options: EditorialOptions & {
    titles?: BilingualText;
    excerpts?: BilingualText;
    coverImageId?: string | null;
    authorId?: string | null;
  } = {},
): Promise<Post> {
  const n = next();
  const status = options.status ?? PublicationStatus.DRAFT;
  const repository = dataSource.getRepository(Post);
  const post = await repository.save(
    repository.create({
      slug: `post-${n}`,
      status,
      publishedAt:
        options.publishedAt !== undefined
          ? options.publishedAt
          : status === PublicationStatus.PUBLISHED
            ? daysAgo(1)
            : null,
      coverImageId: options.coverImageId ?? null,
      authorId: options.authorId ?? options.createdById ?? null,
      authorName: 'Test Author',
      createdById: options.createdById ?? null,
    }),
  );
  const titles = options.titles ?? { vi: `Bài viết ${n}`, en: `Post ${n}` };
  for (const locale of LOCALES) {
    if (titles[locale] === undefined) continue;
    await insert(dataSource, PostTranslation, {
      postId: post.id,
      locale,
      title: titles[locale],
      excerpt: options.excerpts?.[locale] ?? '',
      contentHtml: '<p>content</p>',
      tags: [],
      readingTimeMinutes: 1,
    });
  }
  if (options.deleted) await softDelete(dataSource, Post, post.id);
  return post;
}

export async function seedProduct(
  dataSource: DataSource,
  options: EditorialOptions & {
    names?: BilingualText;
    taglines?: BilingualText;
    priceOnRequest?: boolean;
    withPrice?: boolean;
    coverImageId?: string | null;
  } = {},
): Promise<Product> {
  const n = next();
  const status = options.status ?? PublicationStatus.DRAFT;
  const repository = dataSource.getRepository(Product);
  const product = await repository.save(
    repository.create({
      slug: `product-${n}`,
      type: ProductType.SOURCE_CODE,
      status,
      publishedAt:
        options.publishedAt !== undefined
          ? options.publishedAt
          : status === PublicationStatus.PUBLISHED
            ? daysAgo(1)
            : null,
      priceOnRequest: options.priceOnRequest ?? false,
      coverImageId: options.coverImageId ?? null,
      createdById: options.createdById ?? null,
      authorId: options.createdById ?? null,
    }),
  );
  const names = options.names ?? { vi: `Sản phẩm ${n}`, en: `Product ${n}` };
  for (const locale of LOCALES) {
    if (names[locale] === undefined) continue;
    await insert(dataSource, ProductTranslation, {
      productId: product.id,
      locale,
      name: names[locale],
      tagline: options.taglines?.[locale] ?? null,
      descriptionHtml: null,
      features: [],
    });
  }
  if (options.withPrice) {
    await insert(dataSource, ProductPrice, {
      productId: product.id,
      currency: Currency.USD,
      amount: '10.00',
      billingPeriod: BillingPeriod.ONE_TIME,
      isDefault: true,
    });
  }
  if (options.deleted) await softDelete(dataSource, Product, product.id);
  return product;
}

export async function seedProject(
  dataSource: DataSource,
  options: EditorialOptions & {
    titles?: BilingualText;
    summaries?: BilingualText;
    thumbnailId?: string | null;
  } = {},
): Promise<Project> {
  const n = next();
  const status = options.status ?? PublicationStatus.DRAFT;
  const repository = dataSource.getRepository(Project);
  const project = await repository.save(
    repository.create({
      slug: `project-${n}`,
      status,
      thumbnailId: options.thumbnailId ?? null,
      createdById: options.createdById ?? null,
      publishedAt: status === PublicationStatus.PUBLISHED ? daysAgo(1) : null,
    }),
  );
  const titles = options.titles ?? { vi: `Dự án ${n}`, en: `Project ${n}` };
  for (const locale of LOCALES) {
    if (titles[locale] === undefined) continue;
    await insert(dataSource, ProjectTranslation, {
      projectId: project.id,
      locale,
      title: titles[locale],
      summary: options.summaries?.[locale] ?? '',
      descriptionHtml: '',
      industry: null,
    });
  }
  if (options.deleted) await softDelete(dataSource, Project, project.id);
  return project;
}

export async function seedService(
  dataSource: DataSource,
  options: EditorialOptions & {
    titles?: BilingualText;
    summaries?: BilingualText;
    coverImageId?: string | null;
  } = {},
): Promise<ServiceCategory> {
  const n = next();
  const status = options.status ?? PublicationStatus.DRAFT;
  const repository = dataSource.getRepository(ServiceCategory);
  const service = await repository.save(
    repository.create({
      slug: `service-${n}`,
      status,
      iconKey: 'ai',
      coverImageId: options.coverImageId ?? null,
      createdById: options.createdById ?? null,
      publishedAt: status === PublicationStatus.PUBLISHED ? daysAgo(1) : null,
    }),
  );
  const titles = options.titles ?? { vi: `Dịch vụ ${n}`, en: `Service ${n}` };
  for (const locale of LOCALES) {
    if (titles[locale] === undefined) continue;
    await insert(dataSource, ServiceCategoryTranslation, {
      categoryId: service.id,
      locale,
      title: titles[locale],
      categoryName: titles[locale],
      summary: options.summaries?.[locale] ?? '',
      heroTitle: '',
      heroSubtitle: '',
    });
  }
  if (options.deleted) await softDelete(dataSource, ServiceCategory, service.id);
  return service;
}

export async function seedTestimonial(
  dataSource: DataSource,
  options: { status?: TestimonialStatus; authorName?: string; deleted?: boolean } = {},
): Promise<Testimonial> {
  const n = next();
  const repository = dataSource.getRepository(Testimonial);
  const testimonial = await repository.save(
    repository.create({
      authorName: options.authorName ?? `Khách hàng ${n}`,
      company: 'Công ty Thử Nghiệm',
      status: options.status ?? TestimonialStatus.HIDDEN,
    }),
  );
  if (options.deleted) await softDelete(dataSource, Testimonial, testimonial.id);
  return testimonial;
}

export async function seedClientLocation(
  dataSource: DataSource,
  options: { status?: ClientLocationStatus; deleted?: boolean } = {},
): Promise<ClientLocation> {
  const n = next();
  const repository = dataSource.getRepository(ClientLocation);
  const location = await repository.save(
    repository.create({
      name: `Location ${n}`,
      x: 10,
      y: 20,
      status: options.status ?? ClientLocationStatus.HIDDEN,
    }),
  );
  if (options.deleted) await softDelete(dataSource, ClientLocation, location.id);
  return location;
}

export async function seedContact(
  dataSource: DataSource,
  options: {
    fullName?: string;
    email?: string;
    subject?: string | null;
    status?: ContactStatus;
    isSpam?: boolean;
    deleted?: boolean;
  } = {},
): Promise<Contact> {
  const n = next();
  const repository = dataSource.getRepository(Contact);
  const contact = await repository.save(
    repository.create({
      fullName: options.fullName ?? `Người liên hệ ${n}`,
      email: options.email ?? `contact${n}@example.com`,
      subject: options.subject ?? null,
      message: 'Xin chào',
      status: options.status ?? ContactStatus.NEW,
      isSpam: options.isSpam ?? false,
    }),
  );
  if (options.deleted) await softDelete(dataSource, Contact, contact.id);
  return contact;
}

export async function seedUser(
  dataSource: DataSource,
  options: {
    id?: string;
    role?: Role;
    fullName?: string;
    email?: string;
    phone?: string;
    status?: 'active' | 'locked';
    deleted?: boolean;
  } = {},
): Promise<User> {
  const n = next();
  const repository = dataSource.getRepository(User);
  const user = await repository.save(
    repository.create({
      id: options.id,
      fullName: options.fullName ?? `Người dùng ${n}`,
      email: options.email ?? `user${n}@example.com`,
      phone: options.phone ?? `+8490000${String(n).padStart(4, '0')}`,
      passwordHash: 'not-a-real-hash',
      role: options.role ?? Role.CUSTOMER,
      status: options.status as User['status'] | undefined,
    }),
  );
  if (options.deleted) await softDelete(dataSource, User, user.id);
  return user;
}

export async function seedPage(
  dataSource: DataSource,
  options: {
    path?: string;
    status?: PageStatus;
    titles?: BilingualText;
    visibleSections?: number;
    hiddenSections?: number;
    deleted?: boolean;
  } = {},
): Promise<Page> {
  const n = next();
  const repository = dataSource.getRepository(Page);
  const page = await repository.save(
    repository.create({
      path: options.path ?? `/page-${n}`,
      templateKey: 'generic',
      status: options.status ?? PageStatus.PUBLISHED,
    }),
  );
  for (const locale of LOCALES) {
    const title = options.titles?.[locale];
    if (title === undefined) continue;
    await insert(dataSource, PageTranslation, { pageId: page.id, locale, title });
  }
  const sectionRepository = dataSource.getRepository(PageSection);
  const sections = [
    ...Array.from({ length: options.visibleSections ?? 0 }, () => true),
    ...Array.from({ length: options.hiddenSections ?? 0 }, () => false),
  ];
  for (const isVisible of sections) {
    await sectionRepository.save(
      sectionRepository.create({
        pageId: page.id,
        sectionKey: `section-${next()}`,
        type: 'text',
        isVisible,
      }),
    );
  }
  if (options.deleted) await softDelete(dataSource, Page, page.id);
  return page;
}

export async function seedNavigationMenu(dataSource: DataSource, key: string): Promise<void> {
  const repository = dataSource.getRepository(NavigationMenu);
  await repository.save(repository.create({ key }));
}

export async function seedSetting(dataSource: DataSource, group: string): Promise<void> {
  const repository = dataSource.getRepository(SiteSetting);
  await repository.save(repository.create({ group, value: {}, isPublic: true }));
}

export async function seedAuditEntry(
  dataSource: DataSource,
  options: { action: string; actorName?: string; occurredAt?: Date },
): Promise<AuditLogEntry> {
  const repository = dataSource.getRepository(AuditLogEntry);
  return repository.save(
    repository.create({
      action: options.action,
      actorName: options.actorName ?? 'Tester',
      entityName: 'Post',
      entityId: randomUUID(),
      occurredAt: options.occurredAt ?? new Date(),
    }),
  );
}

// Empties every table of the throw-away test schema so each test starts from a known state
export async function resetDatabase(dataSource: DataSource, schema: string): Promise<void> {
  if (!/^test_[0-9a-f]{12}$/.test(schema))
    throw new Error('Refusing to truncate a non-test schema');
  const tables = dataSource.entityMetadatas.map(
    (metadata) => `"${schema}"."${metadata.tableName}"`,
  );
  await dataSource.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
}
