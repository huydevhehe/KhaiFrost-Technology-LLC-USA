import { validationFailed } from '../../../common/exceptions/exception.factories';
import { getSectionTypeDefinition } from '../../../modules/pages/constants/section-types.registry';
import { Page } from '../../../modules/pages/entities/page.entity';
import { PagePublishingService } from '../../../modules/pages/services/page-publishing.service';
import { PageSectionsService } from '../../../modules/pages/services/page-sections.service';
import { PagesService } from '../../../modules/pages/services/pages.service';
import {
  findPublishGaps,
  validateSectionContent,
} from '../../../modules/pages/utils/section-content.validator';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { buildPageBlueprints, PageBlueprint } from '../support/page-blueprints';
import { SummaryBuilder } from '../support/summary-builder';

// Every problem the create/publish calls would report later, found before anything is written
function assertPublishable(blueprint: PageBlueprint): void {
  const problems: { field: string; messages: string[] }[] = [];
  for (const section of blueprint.sections) {
    const definition = getSectionTypeDefinition(section.type);
    if (!definition) {
      problems.push({
        field: section.sectionKey,
        messages: [`Unknown section type ${section.type}`],
      });
      continue;
    }
    try {
      const { content } = validateSectionContent(definition, section.content);
      const gaps = findPublishGaps(definition, content, section.sectionKey);
      for (const gap of gaps.missingRequired)
        problems.push({ field: gap.field, messages: ['is required'] });
      for (const gap of gaps.missingTranslations) {
        problems.push({
          field: `${gap.locale}:${gap.field}`,
          messages: ['translation is missing'],
        });
      }
    } catch (error) {
      problems.push({
        field: `${blueprint.mapping.path}#${section.sectionKey}`,
        messages: [(error as Error).message],
      });
    }
  }
  if (problems.length > 0) throw validationFailed(problems);
}

export class PagesSeeder implements Seeder {
  readonly name = 'pages';
  readonly description =
    'System pages (/, /dich-vu, /du-an, /ve-chung-toi, /lien-he) with sections, published';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const pages = context.services.get(PagesService);
    const sections = context.services.get(PageSectionsService);
    const publishing = context.services.get(PagePublishingService);
    const rows = context.dataSource.getRepository(Page);

    let blueprints: PageBlueprint[];
    try {
      blueprints = await buildPageBlueprints(context);
    } catch (error) {
      builder.fail('pages', error);
      return builder.summary;
    }

    for (const blueprint of blueprints) {
      const { mapping } = blueprint;
      await builder.item(`page ${mapping.path}`, {
        exists: () => rows.exists({ where: { path: mapping.path }, withDeleted: true }),
        validate: () => assertPublishable(blueprint),
        create: async () => {
          assertPublishable(blueprint);
          const seoOf = (locale: 'vi' | 'en') => ({
            title: blueprint.title[locale],
            seoTitle: blueprint.seo[locale].title,
            seoDescription: blueprint.seo[locale].description,
            seoKeywords: blueprint.seo[locale].keywords,
            ogImageId: blueprint.ogImageId,
          });
          const page = await pages.create(
            {
              path: mapping.path,
              templateKey: mapping.templateKey,
              translations: { vi: seoOf('vi'), en: seoOf('en') },
            },
            { isSystem: true },
          );
          for (const section of blueprint.sections) {
            await sections.add(
              page.id,
              { type: section.type, sectionKey: section.sectionKey, content: section.content },
              { isSystem: true },
            );
          }
          await publishing.publish(page.id, {
            note: 'Initial import of the existing website content',
          });
        },
      });
    }

    builder.reportUnresolvedMedia();
    return builder.summary;
  }
}
