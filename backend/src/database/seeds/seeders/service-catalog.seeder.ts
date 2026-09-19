import { CreateServiceCategoryDto } from '../../../modules/service-catalog/dto/service-category-input.dto';
import { UpdateServicesOverviewDto } from '../../../modules/service-catalog/dto/update-services-overview.dto';
import { ServiceCategory } from '../../../modules/service-catalog/entities/service-category.entity';
import { ServiceCategoriesService } from '../../../modules/service-catalog/services/service-categories.service';
import { ServicesOverviewService } from '../../../modules/service-catalog/services/services-overview.service';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import {
  SourceLocalizedText,
  SourceService,
  SourceServiceCategoryDetail,
  SourceStat,
} from '../support/source-content.types';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

type Translated<T> = { vi: T; en: T };

function both<T>(build: (locale: 'vi' | 'en') => T): Translated<T> {
  return { vi: build('vi'), en: build('en') };
}

function statInput(stat: SourceStat) {
  return {
    iconKey: stat.icon,
    value: stat.value,
    translations: both((locale) => ({
      label: stat.label[locale],
      description: stat.description[locale],
    })),
  };
}

function iconTitleDescription(item: {
  icon: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
}) {
  return {
    iconKey: item.icon,
    translations: both((locale) => ({
      title: item.title[locale],
      description: item.description[locale],
    })),
  };
}

// "/dich-vu/ai-automation#ai-receptionist" -> "ai-receptionist"
export function anchorOf(href: string): string | null {
  const index = href.indexOf('#');
  return index >= 0 && index < href.length - 1 ? href.slice(index + 1) : null;
}

export class ServiceCatalogSeeder implements Seeder {
  readonly name = 'service-catalog';
  readonly description =
    'Service categories with all their blocks (published) and the overview page blocks';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const categories = context.services.get(ServiceCategoriesService);
    const overview = context.services.get(ServicesOverviewService);
    const repository = context.dataSource.getRepository(ServiceCategory);
    const details = context.content.serviceCategoryDetails();

    for (const [index, service] of context.content.services().entries()) {
      const detail = details.find((candidate) => candidate.slug === service.slug);
      if (!detail) {
        builder.fail(service.slug, 'serviceCategoryDetails.ts has no entry for this service');
        continue;
      }
      let dto: CreateServiceCategoryDto;
      try {
        dto = await this.buildCategory(context, service, detail, index);
      } catch (error) {
        builder.fail(service.slug, error);
        continue;
      }
      await builder.item(`service ${service.slug}`, {
        exists: () => repository.exists({ where: { slug: service.slug }, withDeleted: true }),
        create: async () => {
          const created = await categories.create(dto);
          await categories.publish(created.id);
        },
        validate: () => assertValidDto(CreateServiceCategoryDto, dto),
      });
    }

    await builder.item('services overview', {
      exists: async () => {
        const current = await overview.get();
        return current.stats.length + current.processSteps.length + current.highlights.length > 0;
      },
      create: () => overview.update(this.buildOverview(context)),
      validate: () => assertValidDto(UpdateServicesOverviewDto, this.buildOverview(context)),
    });

    builder.reportUnresolvedMedia();
    return builder.summary;
  }

  private buildOverview(context: SeedContext): UpdateServicesOverviewDto {
    return {
      stats: context.content.servicesOverviewStats().map(statInput),
      processSteps: context.content.servicesOverviewProcessSteps().map(iconTitleDescription),
      highlights: context.content.whyUsItems().map(iconTitleDescription),
    } as UpdateServicesOverviewDto;
  }

  private async buildCategory(
    context: SeedContext,
    service: SourceService,
    detail: SourceServiceCategoryDetail,
    sortOrder: number,
  ): Promise<CreateServiceCategoryDto> {
    const media = context.media;
    const products = [];
    for (const product of detail.products) {
      products.push({
        anchor: anchorOf(product.href),
        imageId: await media.idFor(product.image),
        durationLabel: product.duration,
        tags: product.tags,
        translations: both((locale) => ({
          name: product.name[locale],
          description: product.description[locale],
        })),
      });
    }
    const caseStudies = [];
    for (const study of detail.caseStudies) {
      caseStudies.push({
        imageId: await media.idFor(study.image),
        durationLabel: study.duration,
        tags: study.tags,
        translations: both((locale) => ({
          name: study.name[locale],
          description: study.description[locale],
        })),
      });
    }
    const testimonials = [];
    for (const testimonial of detail.testimonials) {
      testimonials.push({
        authorName: testimonial.name,
        avatarId: await media.idFor(testimonial.avatar),
        translations: both((locale) => ({
          quote: testimonial.quote[locale],
          authorRole: testimonial.role,
        })),
      });
    }
    const banner = detail.partnerBanner;
    const partnerBanner = banner
      ? {
          imageId: await media.idFor(banner.image),
          ctaHref: banner.ctaHref,
          translations: both((locale) => ({
            label: banner.label[locale],
            heading: banner.heading[locale],
            text: banner.text[locale],
            ctaLabel: banner.ctaLabel[locale],
          })),
        }
      : undefined;

    return {
      slug: service.slug,
      iconKey: service.icon,
      sortOrder,
      coverImageId: await media.idFor(service.image),
      heroImageId: await media.idFor(detail.heroImage),
      translations: both((locale) => ({
        title: service.title[locale],
        categoryName: detail.categoryName[locale],
        summary: service.description[locale],
        heroTitle: detail.heroTitle[locale],
        heroSubtitle: detail.heroSubtitle[locale],
        productsEyebrow: detail.productsEyebrow[locale],
        productsHeading: detail.productsHeading[locale],
        productsIntro: detail.productsIntro[locale],
      })),
      stats: detail.stats.map(statInput),
      products,
      processSteps: detail.process.map(iconTitleDescription),
      whyUs: detail.whyUs.map(iconTitleDescription),
      caseStudies,
      testimonials,
      faq: detail.faq.map((item) => ({
        translations: both((locale) => ({
          question: item.question[locale],
          answer: item.answer[locale],
        })),
      })),
      ...(partnerBanner ? { partnerBanner } : {}),
    } as CreateServiceCategoryDto;
  }
}
