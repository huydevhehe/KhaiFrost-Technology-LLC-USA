import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { translationMissing } from '../../../common/exceptions/exception.factories';
import { UpdateServicesOverviewDto } from '../dto/update-services-overview.dto';
import { ServicesOverviewAdminResponseDto } from '../dto/service-response.dto';
import { toAdminOverview } from '../mappers/service-category.mapper';
import { CategoryCollectionsService, MissingTranslation } from './category-collections.service';
import { CollectionItemInput, CollectionItemRecord } from './collection-definition';
import {
  OVERVIEW_COLLECTION_KEYS,
  OVERVIEW_COLLECTIONS,
  OverviewCollectionKey,
} from './collection-definitions';
import { ServiceCategoryAggregateLoader } from './service-category-aggregate-loader.service';

@Injectable()
export class ServicesOverviewService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly collections: CategoryCollectionsService,
    private readonly loader: ServiceCategoryAggregateLoader,
  ) {}

  async get(): Promise<ServicesOverviewAdminResponseDto> {
    const overview = await this.loader.loadOverview(this.dataSource.manager);
    return toAdminOverview(overview, new Map());
  }

  async update(dto: UpdateServicesOverviewDto): Promise<ServicesOverviewAdminResponseDto> {
    const payload = dto as unknown as Partial<Record<OverviewCollectionKey, CollectionItemInput[]>>;
    const missing: MissingTranslation[] = [];
    for (const key of OVERVIEW_COLLECTION_KEYS) {
      const items = payload[key];
      if (!items) continue;
      const records: CollectionItemRecord[] = items.map((item, index) => ({
        id: '',
        sortOrder: index,
        fields: {},
        translations: (item.translations ?? {}) as CollectionItemRecord['translations'],
      }));
      missing.push(
        ...this.collections.findMissingTranslations(OVERVIEW_COLLECTIONS[key], records, key),
      );
    }
    if (missing.length > 0) throw translationMissing(missing);

    await this.dataSource.transaction(async (manager) => {
      for (const key of OVERVIEW_COLLECTION_KEYS) {
        const items = payload[key];
        if (items === undefined) continue;
        await this.collections.replace(manager, OVERVIEW_COLLECTIONS[key], null, items);
      }
    });
    return this.get();
  }
}
