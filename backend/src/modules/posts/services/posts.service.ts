import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { paginate } from '../../../common/dto/paginate';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { PublicPostListQueryDto, PublicPostSort } from '../dto/public-post-queries.dto';
import {
  PublicPostDetailResponse,
  PublicPostListItemResponse,
  PublicPostSlugResponse,
} from '../dto/post-public-response.dto';
import { Post } from '../entities/post.entity';
import {
  collectPostMediaIds,
  toPublicDetail,
  toPublicListItem,
  toPublicNeighbor,
} from '../mappers/post.mapper';
import { PostMediaService } from './post-media.service';

const RELATED_POSTS_LIMIT = 3;

// Read side of published articles; also the lookup other modules use (search, sitemap, home page blocks)
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    private readonly media: PostMediaService,
  ) {}

  async list(
    query: PublicPostListQueryDto,
  ): Promise<PaginatedResponseDto<PublicPostListItemResponse>> {
    const builder = this.publishedWithCategory(query.locale);
    if (query.categorySlug) {
      builder.andWhere('category.slug = :categorySlug AND category.isActive = true', {
        categorySlug: query.categorySlug,
      });
    }
    if (query.featured !== undefined) {
      builder.andWhere('post.isFeatured = :featured', { featured: query.featured });
    }
    if (query.search) {
      builder.andWhere('(translation.title ILIKE :pattern OR translation.excerpt ILIKE :pattern)', {
        pattern: containsPattern(query.search),
      });
    }
    const direction = query.sort === PublicPostSort.OLDEST ? 'ASC' : 'DESC';
    builder.orderBy('post.publishedAt', direction).addOrderBy('post.id', direction);

    const page = await paginate(builder, query);
    return new PaginatedResponseDto(await this.toListItems(page.items, query.locale), page.meta);
  }

  async getBySlug(slug: string, locale: Locale): Promise<PublicPostDetailResponse> {
    const post = await this.publishedWithCategory(locale)
      .andWhere('post.slug = :slug', { slug })
      .getOne();
    if (!post || !post.publishedAt) throw notFound('Article');

    const [related, previous, next] = await Promise.all([
      this.findRelated(post, locale),
      this.findNeighbor(post, locale, 'previous'),
      this.findNeighbor(post, locale, 'next'),
    ]);
    const relatedItems = await this.toListItems(related, locale);
    const mediaIds = collectPostMediaIds([post]);
    const media = await this.media.resolve(mediaIds);
    return toPublicDetail(
      post,
      locale,
      media,
      relatedItems,
      previous ? toPublicNeighbor(previous, locale) : null,
      next ? toPublicNeighbor(next, locale) : null,
    );
  }

  async listSlugs(): Promise<PublicPostSlugResponse[]> {
    const posts = await this.posts
      .createQueryBuilder('post')
      .select(['post.id', 'post.slug', 'post.publishedAt', 'post.updatedAt'])
      .where('post.status = :status AND post.publishedAt <= NOW()', {
        status: PublicationStatus.PUBLISHED,
      })
      .orderBy('post.publishedAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .getMany();
    return posts.map((post) => ({
      slug: post.slug,
      publishedAt: post.publishedAt as Date,
      updatedAt: post.updatedAt,
    }));
  }

  // Unpublished, scheduled or unknown ids are silently left out
  async findSummariesByIds(
    ids: readonly string[],
    locale: Locale,
  ): Promise<PublicPostListItemResponse[]> {
    if (ids.length === 0) return [];
    const posts = await this.publishedWithCategory(locale)
      .andWhere('post.id IN (:...ids)', { ids })
      .orderBy('post.publishedAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .getMany();
    return this.toListItems(posts, locale);
  }

  async findPublishedIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const found = await this.posts
      .createQueryBuilder('post')
      .select('post.id')
      .where('post.id IN (:...ids)', { ids })
      .andWhere('post.status = :status AND post.publishedAt <= NOW()', {
        status: PublicationStatus.PUBLISHED,
      })
      .getMany();
    return found.map((post) => post.id);
  }

  // Only rows that are published, already visible and have a title in the requested language
  private published(locale: Locale): SelectQueryBuilder<Post> {
    return this.posts
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.translations', 'translation', 'translation.locale = :locale', {
        locale,
      })
      .where('post.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('post.publishedAt <= NOW()')
      .andWhere("btrim(translation.title) <> ''");
  }

  private publishedWithCategory(locale: Locale): SelectQueryBuilder<Post> {
    return this.published(locale)
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect(
        'category.translations',
        'categoryTranslation',
        'categoryTranslation.locale = :locale',
      );
  }

  private async findRelated(post: Post, locale: Locale): Promise<Post[]> {
    if (!post.categoryId || !post.category?.isActive) return [];
    return this.publishedWithCategory(locale)
      .andWhere('post.categoryId = :categoryId AND post.id <> :id', {
        categoryId: post.categoryId,
        id: post.id,
      })
      .orderBy('post.publishedAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(RELATED_POSTS_LIMIT)
      .getMany();
  }

  private findNeighbor(
    post: Post,
    locale: Locale,
    side: 'previous' | 'next',
  ): Promise<Post | null> {
    const before = side === 'previous';
    const comparison = before ? '<' : '>';
    const direction = before ? 'DESC' : 'ASC';
    return this.published(locale)
      .andWhere(
        `(post.publishedAt ${comparison} :publishedAt OR (post.publishedAt = :publishedAt AND post.id ${comparison} :id))`,
        { publishedAt: post.publishedAt, id: post.id },
      )
      .orderBy('post.publishedAt', direction)
      .addOrderBy('post.id', direction)
      .take(1)
      .getOne();
  }

  private async toListItems(posts: Post[], locale: Locale): Promise<PublicPostListItemResponse[]> {
    const media = await this.media.resolve(posts.map((post) => post.coverImageId));
    return posts.map((post) => toPublicListItem(post, locale, media));
  }
}
