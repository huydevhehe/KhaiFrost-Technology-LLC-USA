import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { ProductCardDto } from '../../products/dto/product-response.dto';
import { ProductsService } from '../../products/services/products.service';
import { businessRuleViolation } from '../../products/utils/business-rule-violation';
import { FavoriteIdsDto, FavoriteStateDto } from '../dto/favorite-response.dto';
import { FavoritesListQueryDto } from '../dto/favorites-query.dto';
import { Favorite } from '../entities/favorite.entity';

export const MAX_FAVORITES_PER_USER = 500;
const MAX_FAVORITE_IDS = 1000;

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    private readonly products: ProductsService,
  ) {}

  async list(
    userId: string,
    query: FavoritesListQueryDto,
  ): Promise<PaginatedResponseDto<ProductCardDto>> {
    const visibleIds = await this.listVisibleProductIds(userId, MAX_FAVORITES_PER_USER);
    const start = (query.page - 1) * query.pageSize;
    const pageIds = visibleIds.slice(start, start + query.pageSize);
    const cards = await this.products.getPublishedByIds(pageIds, query.locale as Locale);
    return new PaginatedResponseDto(cards, {
      page: query.page,
      pageSize: query.pageSize,
      total: visibleIds.length,
      totalPages: Math.ceil(visibleIds.length / query.pageSize),
    });
  }

  async listIds(userId: string): Promise<FavoriteIdsDto> {
    return { productIds: await this.listVisibleProductIds(userId, MAX_FAVORITE_IDS) };
  }

  async add(userId: string, productId: string): Promise<FavoriteStateDto> {
    if (!(await this.products.isPublished(productId))) throw notFound('Product');

    const alreadyFavorited = await this.favorites.exists({ where: { userId, productId } });
    if (!alreadyFavorited) {
      const total = await this.favorites.count({ where: { userId } });
      if (total >= MAX_FAVORITES_PER_USER) {
        throw businessRuleViolation(
          'FAVORITES_LIMIT_REACHED',
          `You can keep at most ${MAX_FAVORITES_PER_USER} favourites`,
          { limit: MAX_FAVORITES_PER_USER },
        );
      }
      // ON CONFLICT DO NOTHING keeps concurrent identical requests idempotent
      await this.favorites
        .createQueryBuilder()
        .insert()
        .values({ userId, productId })
        .orIgnore()
        .execute();
    }
    return { productId, favorited: true };
  }

  async remove(userId: string, productId: string): Promise<FavoriteStateDto> {
    await this.favorites.delete({ userId, productId });
    return { productId, favorited: false };
  }

  // For admin analytics: how many customers favourited each product
  async countByProduct(productIds: readonly string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (productIds.length === 0) return counts;
    const rows = await this.favorites
      .createQueryBuilder('favorite')
      .select('favorite.productId', 'productId')
      .addSelect('COUNT(*)', 'total')
      .where({ productId: In([...productIds]) })
      .groupBy('favorite.productId')
      .getRawMany<{ productId: string; total: string }>();
    for (const row of rows) counts.set(row.productId, Number(row.total));
    return counts;
  }

  private async listVisibleProductIds(userId: string, limit: number): Promise<string[]> {
    const rows = await this.favorites.find({
      where: { userId },
      select: { productId: true },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: limit,
    });
    const ids = rows.map((row) => row.productId);
    const visible = await this.products.filterPublishedIds(ids);
    return ids.filter((id) => visible.has(id));
  }
}
