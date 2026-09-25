import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { paginate } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { PublicServiceListQueryDto } from '../dto/public-service-queries.dto';
import {
  PublicServiceCardResponseDto,
  PublicServiceDetailResponseDto,
  PublicServicesOverviewResponseDto,
} from '../dto/service-response.dto';
import { ServiceCategory } from '../entities/service-category.entity';
import { ServiceCategoryTranslation } from '../entities/service-category-translation.entity';
import { toPublicCard, toPublicDetail, toPublicOverview } from '../mappers/service-category.mapper';
import { ServiceCategoryAggregateLoader } from './service-category-aggregate-loader.service';

const MAX_OVERVIEW_SERVICES = 100;

@Injectable()
export class PublicServiceCatalogService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly loader: ServiceCategoryAggregateLoader,
    private readonly media: MediaReferenceService,
  ) {}

  async list(
    query: PublicServiceListQueryDto,
  ): Promise<PaginatedResponseDto<PublicServiceCardResponseDto>> {
    const builder = this.dataSource
      .getRepository(ServiceCategory)
      .createQueryBuilder('category')
      .where('category.status = :status', { status: PublicationStatus.PUBLISHED })
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.createdAt', 'ASC');
    const page = await paginate(builder, query);
    const cards = await this.toCards(page.items, query.locale);
    return new PaginatedResponseDto(cards, page.meta);
  }

  async listSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    const rows = await this.dataSource.getRepository(ServiceCategory).find({
      select: { slug: true, updatedAt: true },
      where: { status: PublicationStatus.PUBLISHED },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt }));
  }

  async getBySlug(slug: string, locale: Locale): Promise<PublicServiceDetailResponseDto> {
    const category = await this.dataSource
      .getRepository(ServiceCategory)
      .findOne({ where: { slug, status: PublicationStatus.PUBLISHED } });
    if (!category) throw notFound('Service');
    const aggregate = await this.loader.load(this.dataSource.manager, category);
    const urls = await this.loader.resolveAggregateUrls(aggregate);
    const productLinks = await this.loader.resolveProductLinks(aggregate);
    return toPublicDetail(aggregate, locale, urls, productLinks);
  }

  async getOverview(locale: Locale): Promise<PublicServicesOverviewResponseDto> {
    const categories = await this.dataSource.getRepository(ServiceCategory).find({
      where: { status: PublicationStatus.PUBLISHED },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      take: MAX_OVERVIEW_SERVICES,
    });
    const cards = await this.toCards(categories, locale);
    const overview = await this.loader.loadOverview(this.dataSource.manager);
    const urls = await this.loader.resolveOverviewUrls(overview);
    return toPublicOverview(cards, overview, locale, urls);
  }

  private async toCards(
    categories: ServiceCategory[],
    locale: Locale,
  ): Promise<PublicServiceCardResponseDto[]> {
    if (categories.length === 0) return [];
    const translations = await this.dataSource.getRepository(ServiceCategoryTranslation).find({
      where: { categoryId: In(categories.map((category) => category.id)), locale },
    });
    const urls = await this.media.resolveUrls(
      categories.flatMap((category) => (category.coverImageId ? [category.coverImageId] : [])),
    );
    return categories.map((category) =>
      toPublicCard(
        category,
        translations.find((row) => row.categoryId === category.id),
        urls,
      ),
    );
  }
}
