import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  CategoryCollections,
  collectAggregateMediaIds,
  MediaUrlMap,
  OverviewCollections,
  ServiceCategoryAggregate,
  collectRecordMediaIds,
} from '../mappers/service-category.mapper';
import { ServiceCategory } from '../entities/service-category.entity';
import { ServiceCategoryTranslation } from '../entities/service-category-translation.entity';
import { CategoryCollectionsService } from './category-collections.service';
import {
  CATEGORY_COLLECTION_KEYS,
  CATEGORY_COLLECTIONS,
  OVERVIEW_COLLECTION_KEYS,
  OVERVIEW_COLLECTIONS,
} from './collection-definitions';

@Injectable()
export class ServiceCategoryAggregateLoader {
  constructor(
    private readonly collections: CategoryCollectionsService,
    private readonly media: MediaReferenceService,
  ) {}

  async load(manager: EntityManager, category: ServiceCategory): Promise<ServiceCategoryAggregate> {
    const translations = await manager.find(ServiceCategoryTranslation, {
      where: { categoryId: category.id },
    });
    const loaded: Partial<CategoryCollections> = {};
    for (const key of CATEGORY_COLLECTION_KEYS) {
      loaded[key] = await this.collections.load(manager, CATEGORY_COLLECTIONS[key], category.id);
    }
    return { category, translations, collections: loaded as CategoryCollections };
  }

  async loadOverview(manager: EntityManager): Promise<OverviewCollections> {
    const loaded: Partial<OverviewCollections> = {};
    for (const key of OVERVIEW_COLLECTION_KEYS) {
      loaded[key] = await this.collections.load(manager, OVERVIEW_COLLECTIONS[key], null);
    }
    return loaded as OverviewCollections;
  }

  resolveAggregateUrls(aggregate: ServiceCategoryAggregate): Promise<MediaUrlMap> {
    return this.media.resolveUrls(collectAggregateMediaIds(aggregate));
  }

  resolveOverviewUrls(collections: OverviewCollections): Promise<MediaUrlMap> {
    return this.media.resolveUrls(collectRecordMediaIds(OVERVIEW_COLLECTIONS, collections));
  }
}
