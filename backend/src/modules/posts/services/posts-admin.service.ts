import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { DomainEvent, PostSubmittedForReviewEvent } from '../../../common/constants/domain-events';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import {
  forbidden,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { assertCanModifyContent } from '../../../common/policies/content-ownership.policy';
import { assertAllLocalesPresent } from '../../../common/utils/assert-all-locales-present';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import {
  DEFAULT_AUTHOR_NAME,
  POST_SLUG_UNIQUE_INDEX,
  REQUIRED_PUBLISH_FIELDS,
} from '../constants/post-constraints';
import {
  isEditableWithoutUpdateAny,
  PostWorkflowAction,
  resolveTransition,
} from '../domain/post-status-transitions';
import { CreatePostDto } from '../dto/create-post.dto';
import { ListPostsQueryDto } from '../dto/list-posts-query.dto';
import { AdminPostDetailResponse, AdminPostListItemResponse } from '../dto/post-admin-response.dto';
import {
  PostTranslationInputDto,
  PostTranslationsInputDto,
} from '../dto/post-translation-input.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { User } from '../../users/entities/user.entity';
import { PostCategory } from '../entities/post-category.entity';
import { PostTranslation } from '../entities/post-translation.entity';
import { Post } from '../entities/post.entity';
import { collectPostMediaIds, toAdminDetail, toAdminListItem } from '../mappers/post.mapper';
import {
  computeReadingTimeMinutes,
  deriveExcerpt,
  normalizeTags,
  sanitizeContent,
  toPlainText,
} from '../utils/post-content';
import { executeWithUniqueSlug } from '../utils/unique-slug-execution';
import { PostMediaService } from './post-media.service';

const LIST_SORT_FIELDS = ['updatedAt', 'createdAt', 'publishedAt', 'slug', 'status'] as const;

type TranslationValues = Pick<
  PostTranslation,
  | 'title'
  | 'excerpt'
  | 'contentHtml'
  | 'tags'
  | 'readingTimeMinutes'
  | 'seoTitle'
  | 'seoDescription'
  | 'seoKeywords'
  | 'canonicalUrl'
  | 'noIndex'
  | 'ogImageId'
>;

interface TransitionOutcome {
  submittedEvent?: PostSubmittedForReviewEvent;
}

function toPublishCheckInput(translations: readonly PostTranslation[]) {
  return translations.map(({ locale, title, excerpt, contentHtml }) => ({
    locale,
    title,
    excerpt,
    contentHtml,
  }));
}

@Injectable()
export class PostsAdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(PostCategory) private readonly categories: Repository<PostCategory>,
    @InjectRepository(PostTranslation) private readonly translations: Repository<PostTranslation>,
    private readonly media: PostMediaService,
    private readonly events: EventEmitter2,
  ) {}

  async list(query: ListPostsQueryDto): Promise<PaginatedResponseDto<AdminPostListItemResponse>> {
    const builder = this.posts.createQueryBuilder('post');
    this.applyListFilters(builder, query);
    const sort = resolveSort(query, LIST_SORT_FIELDS, 'updatedAt');
    builder.orderBy(`post.${sort.field}`, sort.order, 'NULLS LAST').addOrderBy('post.id', 'ASC');

    const page = await paginate(builder, query);
    const posts = page.items;
    await this.attachRelations(posts);
    const media = await this.media.resolve(posts.map((post) => post.coverImageId));
    return new PaginatedResponseDto(
      posts.map((post) => toAdminListItem(post, query.locale, media)),
      page.meta,
    );
  }

  async getById(id: string): Promise<AdminPostDetailResponse> {
    const post = await this.posts.findOne({
      where: { id },
      relations: { translations: true, category: { translations: true } },
    });
    if (!post) throw notFound('Post');
    const media = await this.media.resolve(collectPostMediaIds([post]));
    return toAdminDetail(post, media);
  }

  async create(dto: CreatePostDto, user: AuthenticatedUser): Promise<AdminPostDetailResponse> {
    const titles = SUPPORTED_LOCALES.map((locale) =>
      toPlainText(dto.translations[locale]?.title ?? ''),
    );
    const sourceTitle = titles.find((title) => title !== '');
    if (!sourceTitle) {
      throw validationFailed([
        { field: 'translations', messages: ['At least one language needs a title'] },
      ]);
    }
    await this.assertReferencesExist(dto.categoryId, dto.coverImageId, dto.translations);

    const id = await executeWithUniqueSlug({
      suppliedSlug: dto.slug,
      sourceText: sourceTitle,
      uniqueIndexName: POST_SLUG_UNIQUE_INDEX,
      isTaken: (slug) => this.posts.exists({ where: { slug } }),
      execute: (slug) =>
        this.dataSource.transaction(async (manager) => {
          const post = await manager.save(
            manager.create(Post, {
              slug,
              status: PublicationStatus.DRAFT,
              publishedAt: null,
              isFeatured: dto.isFeatured ?? false,
              categoryId: dto.categoryId ?? null,
              coverImageId: dto.coverImageId ?? null,
              authorId: user.id,
              authorName:
                toPlainText(dto.authorName ?? '') ||
                (await this.resolveCreatorName(manager, user.id)),
              createdById: user.id,
              updatedById: user.id,
            }),
          );
          await this.upsertTranslations(manager, post.id, dto.translations, []);
          return post.id;
        }),
    });
    return this.getById(id);
  }

  async update(
    id: string,
    dto: UpdatePostDto,
    user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    if (dto.publishedAt !== undefined && !roleHasPermission(user.role, Permission.POST_PUBLISH)) {
      throw forbidden('Only publishers can change the publication date');
    }
    await this.assertReferencesExist(dto.categoryId, dto.coverImageId, dto.translations);

    const apply = (slug?: string) =>
      this.dataSource.transaction(async (manager) => {
        const post = await manager.findOne(Post, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!post) throw notFound('Post');
        this.assertCanEdit(post, user);
        assertVersionMatches(post.version, dto.version);

        if (slug) post.slug = slug;
        if (dto.categoryId !== undefined) post.categoryId = dto.categoryId;
        if (dto.coverImageId !== undefined) post.coverImageId = dto.coverImageId;
        if (dto.isFeatured !== undefined) post.isFeatured = dto.isFeatured;
        if (dto.authorName !== undefined) {
          post.authorName = toPlainText(dto.authorName) || DEFAULT_AUTHOR_NAME;
        }
        if (dto.publishedAt !== undefined) post.publishedAt = dto.publishedAt;

        const existing = await manager.find(PostTranslation, { where: { postId: id } });
        const merged = dto.translations
          ? await this.upsertTranslations(manager, id, dto.translations, existing)
          : existing;
        if (post.status === PublicationStatus.PUBLISHED) {
          assertAllLocalesPresent(toPublishCheckInput(merged), REQUIRED_PUBLISH_FIELDS);
        }

        this.touch(post, user);
        await manager.save(post);
      });

    if (dto.slug) {
      const current = await this.posts.findOne({ where: { id }, select: { id: true, slug: true } });
      if (!current) throw notFound('Post');
      if (current.slug !== dto.slug) {
        await executeWithUniqueSlug({
          suppliedSlug: dto.slug,
          sourceText: dto.slug,
          uniqueIndexName: POST_SLUG_UNIQUE_INDEX,
          isTaken: (slug) => this.posts.exists({ where: { slug } }),
          execute: (slug) => apply(slug),
        });
        return this.getById(id);
      }
    }
    await apply();
    return this.getById(id);
  }

  submitForReview(id: string, user: AuthenticatedUser): Promise<AdminPostDetailResponse> {
    return this.transition(id, PostWorkflowAction.SUBMIT_FOR_REVIEW, user);
  }

  publish(
    id: string,
    user: AuthenticatedUser,
    publishedAt?: Date,
  ): Promise<AdminPostDetailResponse> {
    return this.transition(id, PostWorkflowAction.PUBLISH, user, publishedAt);
  }

  unpublish(id: string, user: AuthenticatedUser): Promise<AdminPostDetailResponse> {
    return this.transition(id, PostWorkflowAction.UNPUBLISH, user);
  }

  archive(id: string, user: AuthenticatedUser): Promise<AdminPostDetailResponse> {
    return this.transition(id, PostWorkflowAction.ARCHIVE, user);
  }

  restore(id: string, user: AuthenticatedUser): Promise<AdminPostDetailResponse> {
    return this.transition(id, PostWorkflowAction.RESTORE, user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.posts
      .createQueryBuilder()
      .softDelete()
      .where('id = :id AND deleted_at IS NULL', { id })
      .execute();
    if (!result.affected) throw notFound('Post');
  }

  private async transition(
    id: string,
    action: PostWorkflowAction,
    user: AuthenticatedUser,
    publishedAt?: Date,
  ): Promise<AdminPostDetailResponse> {
    const outcome = await this.dataSource.transaction(
      async (manager): Promise<TransitionOutcome> => {
        const post = await manager.findOne(Post, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!post) throw notFound('Post');
        if (action === PostWorkflowAction.SUBMIT_FOR_REVIEW) {
          assertCanModifyContent(
            user,
            post.createdById,
            Permission.POST_UPDATE_OWN,
            Permission.POST_UPDATE_ANY,
          );
        }

        post.status = resolveTransition(action, post.status);
        const translations = await manager.find(PostTranslation, { where: { postId: id } });
        if (action === PostWorkflowAction.PUBLISH) {
          assertAllLocalesPresent(toPublishCheckInput(translations), REQUIRED_PUBLISH_FIELDS);
          post.publishedAt = publishedAt ?? post.publishedAt ?? new Date();
        }
        this.touch(post, user);
        await manager.save(post);

        if (action !== PostWorkflowAction.SUBMIT_FOR_REVIEW) return {};
        const title =
          translations.find((item) => item.locale === Locale.VI)?.title ||
          translations.find((item) => item.locale === Locale.EN)?.title ||
          post.slug;
        return { submittedEvent: { postId: post.id, title, authorId: post.authorId } };
      },
    );
    if (outcome.submittedEvent) {
      this.events.emit(DomainEvent.POST_SUBMITTED_FOR_REVIEW, outcome.submittedEvent);
    }
    return this.getById(id);
  }

  private assertCanEdit(post: Post, user: AuthenticatedUser): void {
    assertCanModifyContent(
      user,
      post.createdById,
      Permission.POST_UPDATE_OWN,
      Permission.POST_UPDATE_ANY,
    );
    if (
      !isEditableWithoutUpdateAny(post.status) &&
      !roleHasPermission(user.role, Permission.POST_UPDATE_ANY)
    ) {
      throw forbidden(`A ${post.status} post can only be edited by someone with full edit rights`);
    }
  }

  // A real column change is needed for the row to be written, which also bumps the version
  private touch(post: Post, user: AuthenticatedUser): void {
    post.updatedAt = new Date();
    post.updatedById = user.id;
  }

  private async assertReferencesExist(
    categoryId: string | null | undefined,
    coverImageId: string | null | undefined,
    translations: PostTranslationsInputDto | undefined,
  ): Promise<void> {
    if (categoryId && !(await this.categories.exists({ where: { id: categoryId } }))) {
      throw validationFailed([{ field: 'categoryId', messages: ['Unknown post category'] }]);
    }
    const mediaIds = [
      coverImageId,
      translations?.vi?.ogImageId,
      translations?.en?.ogImageId,
    ].filter((value): value is string => Boolean(value));
    await this.media.assertAllExist(mediaIds);
  }

  private async upsertTranslations(
    manager: EntityManager,
    postId: string,
    inputs: PostTranslationsInputDto,
    existing: PostTranslation[],
  ): Promise<PostTranslation[]> {
    const result = [...existing];
    for (const locale of SUPPORTED_LOCALES) {
      const input = inputs[locale];
      if (!input) continue;
      const current = result.find((item) => item.locale === locale);
      const row = current ?? manager.create(PostTranslation, { postId, locale });
      Object.assign(row, this.buildTranslationValues(input, current));
      const saved = await manager.save(row);
      if (!current) result.push(saved);
    }
    return result;
  }

  private buildTranslationValues(
    input: PostTranslationInputDto,
    existing: PostTranslation | undefined,
  ): TranslationValues {
    const title = input.title !== undefined ? toPlainText(input.title) : (existing?.title ?? '');
    const contentHtml =
      input.contentHtml !== undefined
        ? sanitizeContent(input.contentHtml)
        : (existing?.contentHtml ?? '');
    let excerpt =
      input.excerpt !== undefined ? toPlainText(input.excerpt) : (existing?.excerpt ?? '');
    if (excerpt === '' && contentHtml !== '') excerpt = deriveExcerpt(contentHtml);

    return {
      title,
      excerpt,
      contentHtml,
      tags: input.tags !== undefined ? normalizeTags(input.tags) : (existing?.tags ?? []),
      readingTimeMinutes: computeReadingTimeMinutes(contentHtml),
      seoTitle:
        input.seoTitle !== undefined ? this.nullable(input.seoTitle) : (existing?.seoTitle ?? null),
      seoDescription:
        input.seoDescription !== undefined
          ? this.nullable(input.seoDescription)
          : (existing?.seoDescription ?? null),
      seoKeywords:
        input.seoKeywords !== undefined
          ? this.nullable(input.seoKeywords)
          : (existing?.seoKeywords ?? null),
      canonicalUrl:
        input.canonicalUrl !== undefined
          ? input.canonicalUrl || null
          : (existing?.canonicalUrl ?? null),
      noIndex: input.noIndex !== undefined ? input.noIndex : (existing?.noIndex ?? false),
      ogImageId: input.ogImageId !== undefined ? input.ogImageId : (existing?.ogImageId ?? null),
    };
  }

  private nullable(value: string | null): string | null {
    if (value === null) return null;
    return toPlainText(value) || null;
  }

  private applyListFilters(builder: SelectQueryBuilder<Post>, query: ListPostsQueryDto): void {
    if (query.status) builder.andWhere('post.status = :status', { status: query.status });
    if (query.categoryId)
      builder.andWhere('post.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.authorId) builder.andWhere('post.authorId = :authorId', { authorId: query.authorId });
    if (query.isFeatured !== undefined) {
      builder.andWhere('post.isFeatured = :isFeatured', { isFeatured: query.isFeatured });
    }
    if (query.dateFrom) {
      builder.andWhere(`post.${query.dateField} >= :dateFrom`, { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      builder.andWhere(`post.${query.dateField} <= :dateTo`, { dateTo: query.dateTo });
    }
    if (query.search) {
      const matching = builder
        .subQuery()
        .select('1')
        .from(PostTranslation, 'search_translation')
        .where('search_translation.post_id = post.id')
        .andWhere('search_translation.title ILIKE :pattern')
        .getQuery();
      builder.andWhere(`(EXISTS ${matching} OR post.slug ILIKE :pattern)`, {
        pattern: containsPattern(query.search),
      });
    }
    if (query.missingLocale) {
      const complete = builder
        .subQuery()
        .select('1')
        .from(PostTranslation, 'complete_translation')
        .where('complete_translation.post_id = post.id')
        .andWhere('complete_translation.locale = :missingLocale')
        .andWhere("btrim(complete_translation.title) <> ''")
        .andWhere("btrim(complete_translation.excerpt) <> ''")
        .andWhere("btrim(complete_translation.content_html) <> ''")
        .getQuery();
      builder.andWhere(`NOT EXISTS ${complete}`, { missingLocale: query.missingLocale });
    }
  }

  private async attachRelations(posts: Post[]): Promise<void> {
    if (posts.length === 0) return;
    const translations = await this.translations.find({
      where: { postId: In(posts.map((post) => post.id)) },
    });
    const categoryIds = [
      ...new Set(posts.map((post) => post.categoryId).filter(Boolean)),
    ] as string[];
    const categories = categoryIds.length
      ? await this.categories.find({
          where: { id: In(categoryIds) },
          relations: { translations: true },
        })
      : [];
    for (const post of posts) {
      post.translations = translations.filter((item) => item.postId === post.id);
      post.category = categories.find((item) => item.id === post.categoryId) ?? null;
    }
  }

  // Default author is the staff member who created the post; only shown in the admin
  private async resolveCreatorName(manager: EntityManager, userId: string): Promise<string> {
    const creator = await manager.getRepository(User).findOne({ where: { id: userId } });
    return toPlainText(creator?.fullName ?? '') || DEFAULT_AUTHOR_NAME;
  }
}
