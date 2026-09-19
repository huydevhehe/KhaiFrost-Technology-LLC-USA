import { ServiceCategoryCaseStudy } from '../entities/service-category-case-study.entity';
import { ServiceCategoryCaseStudyTranslation } from '../entities/service-category-case-study-translation.entity';
import { ServiceCategoryFaqItem } from '../entities/service-category-faq-item.entity';
import { ServiceCategoryFaqItemTranslation } from '../entities/service-category-faq-item-translation.entity';
import { ServiceCategoryPartnerBanner } from '../entities/service-category-partner-banner.entity';
import { ServiceCategoryPartnerBannerTranslation } from '../entities/service-category-partner-banner-translation.entity';
import { ServiceCategoryProcessStep } from '../entities/service-category-process-step.entity';
import { ServiceCategoryProcessStepTranslation } from '../entities/service-category-process-step-translation.entity';
import { ServiceCategoryProduct } from '../entities/service-category-product.entity';
import { ServiceCategoryProductTranslation } from '../entities/service-category-product-translation.entity';
import { ServiceCategoryStat } from '../entities/service-category-stat.entity';
import { ServiceCategoryStatTranslation } from '../entities/service-category-stat-translation.entity';
import { ServiceCategoryTestimonial } from '../entities/service-category-testimonial.entity';
import { ServiceCategoryTestimonialTranslation } from '../entities/service-category-testimonial-translation.entity';
import { ServiceCategoryWhyUsItem } from '../entities/service-category-why-us-item.entity';
import { ServiceCategoryWhyUsItemTranslation } from '../entities/service-category-why-us-item-translation.entity';
import { ServiceHighlight } from '../entities/service-highlight.entity';
import { ServiceHighlightTranslation } from '../entities/service-highlight-translation.entity';
import { CollectionDefinition } from './collection-definition';

const required = (name: string) => ({ name, required: true });
const optional = (name: string) => ({ name, required: false });

const stats: CollectionDefinition = {
  key: 'stats',
  item: ServiceCategoryStat,
  translation: ServiceCategoryStatTranslation,
  translationForeignKey: 'statId',
  scoped: true,
  scalarFields: ['iconKey', 'value'],
  arrayFields: [],
  mediaFields: [],
  translationFields: [required('label'), required('description')],
};

const products: CollectionDefinition = {
  key: 'products',
  item: ServiceCategoryProduct,
  translation: ServiceCategoryProductTranslation,
  translationForeignKey: 'productId',
  scoped: true,
  scalarFields: ['durationLabel', 'anchor'],
  arrayFields: ['tags'],
  mediaFields: ['imageId'],
  translationFields: [required('name'), required('description')],
};

const processSteps: CollectionDefinition = {
  key: 'processSteps',
  item: ServiceCategoryProcessStep,
  translation: ServiceCategoryProcessStepTranslation,
  translationForeignKey: 'stepId',
  scoped: true,
  scalarFields: ['iconKey'],
  arrayFields: [],
  mediaFields: [],
  translationFields: [required('title'), required('description')],
};

const whyUs: CollectionDefinition = {
  key: 'whyUs',
  item: ServiceCategoryWhyUsItem,
  translation: ServiceCategoryWhyUsItemTranslation,
  translationForeignKey: 'itemId',
  scoped: true,
  scalarFields: ['iconKey'],
  arrayFields: [],
  mediaFields: [],
  translationFields: [required('title'), required('description')],
};

const caseStudies: CollectionDefinition = {
  key: 'caseStudies',
  item: ServiceCategoryCaseStudy,
  translation: ServiceCategoryCaseStudyTranslation,
  translationForeignKey: 'caseStudyId',
  scoped: true,
  scalarFields: ['durationLabel'],
  arrayFields: ['tags'],
  mediaFields: ['imageId'],
  translationFields: [required('name'), required('description')],
};

const testimonials: CollectionDefinition = {
  key: 'testimonials',
  item: ServiceCategoryTestimonial,
  translation: ServiceCategoryTestimonialTranslation,
  translationForeignKey: 'testimonialId',
  scoped: true,
  scalarFields: ['authorName'],
  arrayFields: [],
  mediaFields: ['avatarId'],
  translationFields: [required('quote'), optional('authorRole')],
};

const faq: CollectionDefinition = {
  key: 'faq',
  item: ServiceCategoryFaqItem,
  translation: ServiceCategoryFaqItemTranslation,
  translationForeignKey: 'itemId',
  scoped: true,
  scalarFields: [],
  arrayFields: [],
  mediaFields: [],
  translationFields: [required('question'), required('answer')],
};

const partnerBanner: CollectionDefinition = {
  key: 'partnerBanner',
  item: ServiceCategoryPartnerBanner,
  translation: ServiceCategoryPartnerBannerTranslation,
  translationForeignKey: 'bannerId',
  scoped: true,
  scalarFields: ['ctaHref'],
  arrayFields: [],
  mediaFields: ['imageId'],
  translationFields: [
    required('label'),
    required('heading'),
    required('text'),
    required('ctaLabel'),
  ],
};

const highlights: CollectionDefinition = {
  key: 'highlights',
  item: ServiceHighlight,
  translation: ServiceHighlightTranslation,
  translationForeignKey: 'highlightId',
  scoped: false,
  scalarFields: ['iconKey'],
  arrayFields: [],
  mediaFields: [],
  translationFields: [required('title'), required('description')],
};

export const CATEGORY_COLLECTIONS = {
  stats,
  products,
  processSteps,
  whyUs,
  caseStudies,
  testimonials,
  faq,
  partnerBanner,
} as const;

export type CategoryCollectionKey = keyof typeof CATEGORY_COLLECTIONS;

export const CATEGORY_COLLECTION_KEYS = Object.keys(
  CATEGORY_COLLECTIONS,
) as CategoryCollectionKey[];

export const OVERVIEW_COLLECTIONS = { stats, processSteps, highlights } as const;

export type OverviewCollectionKey = keyof typeof OVERVIEW_COLLECTIONS;

export const OVERVIEW_COLLECTION_KEYS = Object.keys(
  OVERVIEW_COLLECTIONS,
) as OverviewCollectionKey[];
