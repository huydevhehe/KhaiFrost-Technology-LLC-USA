import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from '../media/entities/media-asset.entity';
import { MediaReferenceService } from '../media/services/media-reference.service';
import { ServicesAdminController } from './controllers/services-admin.controller';
import { ServicesPublicController } from './controllers/services-public.controller';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceCategoryCaseStudy } from './entities/service-category-case-study.entity';
import { ServiceCategoryCaseStudyTranslation } from './entities/service-category-case-study-translation.entity';
import { ServiceCategoryFaqItem } from './entities/service-category-faq-item.entity';
import { ServiceCategoryFaqItemTranslation } from './entities/service-category-faq-item-translation.entity';
import { ServiceCategoryPartnerBanner } from './entities/service-category-partner-banner.entity';
import { ServiceCategoryPartnerBannerTranslation } from './entities/service-category-partner-banner-translation.entity';
import { ServiceCategoryProcessStep } from './entities/service-category-process-step.entity';
import { ServiceCategoryProcessStepTranslation } from './entities/service-category-process-step-translation.entity';
import { ServiceCategoryProduct } from './entities/service-category-product.entity';
import { ServiceCategoryProductTranslation } from './entities/service-category-product-translation.entity';
import { ServiceCategoryStat } from './entities/service-category-stat.entity';
import { ServiceCategoryStatTranslation } from './entities/service-category-stat-translation.entity';
import { ServiceCategoryTestimonial } from './entities/service-category-testimonial.entity';
import { ServiceCategoryTestimonialTranslation } from './entities/service-category-testimonial-translation.entity';
import { ServiceCategoryTranslation } from './entities/service-category-translation.entity';
import { ServiceCategoryWhyUsItem } from './entities/service-category-why-us-item.entity';
import { ServiceCategoryWhyUsItemTranslation } from './entities/service-category-why-us-item-translation.entity';
import { ServiceHighlight } from './entities/service-highlight.entity';
import { ServiceHighlightTranslation } from './entities/service-highlight-translation.entity';
import { CategoryCollectionsService } from './services/category-collections.service';
import { PublicServiceCatalogService } from './services/public-service-catalog.service';
import { ServiceCategoriesService } from './services/service-categories.service';
import { ServiceCategoryAggregateLoader } from './services/service-category-aggregate-loader.service';
import { ServicesOverviewService } from './services/services-overview.service';

export const SERVICE_CATALOG_ENTITIES = [
  ServiceCategory,
  ServiceCategoryTranslation,
  ServiceCategoryStat,
  ServiceCategoryStatTranslation,
  ServiceCategoryProduct,
  ServiceCategoryProductTranslation,
  ServiceCategoryProcessStep,
  ServiceCategoryProcessStepTranslation,
  ServiceCategoryWhyUsItem,
  ServiceCategoryWhyUsItemTranslation,
  ServiceCategoryCaseStudy,
  ServiceCategoryCaseStudyTranslation,
  ServiceCategoryTestimonial,
  ServiceCategoryTestimonialTranslation,
  ServiceCategoryFaqItem,
  ServiceCategoryFaqItemTranslation,
  ServiceCategoryPartnerBanner,
  ServiceCategoryPartnerBannerTranslation,
  ServiceHighlight,
  ServiceHighlightTranslation,
];

@Module({
  imports: [TypeOrmModule.forFeature([...SERVICE_CATALOG_ENTITIES, MediaAsset])],
  controllers: [ServicesAdminController, ServicesPublicController],
  providers: [
    MediaReferenceService,
    CategoryCollectionsService,
    ServiceCategoryAggregateLoader,
    ServiceCategoriesService,
    ServicesOverviewService,
    PublicServiceCatalogService,
  ],
})
export class ServiceCatalogModule {}
