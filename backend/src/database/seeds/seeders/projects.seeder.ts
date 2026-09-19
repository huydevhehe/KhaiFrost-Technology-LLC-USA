import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { CreateProjectCategoryDto } from '../../../modules/projects/dto/project-category.dto';
import { CreateProjectDto } from '../../../modules/projects/dto/project-input.dto';
import { ProjectCategory } from '../../../modules/projects/entities/project-category.entity';
import { Project } from '../../../modules/projects/entities/project.entity';
import { ProjectCategoriesService } from '../../../modules/projects/services/project-categories.service';
import { ProjectsService } from '../../../modules/projects/services/projects.service';
import { FEATURED_PROJECT_IDS, PROJECT_CATEGORIES, PROJECT_SLUGS } from '../seed-content-mapping';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { toParagraphs } from '../support/html';
import { DRY_RUN_PLACEHOLDER_ID } from '../support/media-resolver';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

export class ProjectsSeeder implements Seeder {
  readonly name = 'projects';
  readonly description = 'Project categories and the showcased projects (published)';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const owner = context.owner;
    if (!owner) {
      builder.fail('owner', 'No owner user is available');
      return builder.summary;
    }
    const categoryService = context.services.get(ProjectCategoriesService);
    const projectService = context.services.get(ProjectsService);
    const categoryRows = context.dataSource.getRepository(ProjectCategory);
    const projectRows = context.dataSource.getRepository(Project);

    for (const [index, category] of PROJECT_CATEGORIES.entries()) {
      const dto = {
        slug: category.slug,
        sortOrder: index,
        translations: { vi: { name: category.vi }, en: { name: category.en } },
      };
      await builder.item(`project category ${category.slug}`, {
        exists: () => categoryRows.exists({ where: { slug: category.slug }, withDeleted: true }),
        create: () => categoryService.create(dto),
        validate: () => assertValidDto(CreateProjectCategoryDto, dto),
      });
    }

    for (const [index, project] of context.content.projects().entries()) {
      const slug = PROJECT_SLUGS[project.id];
      if (!slug) {
        builder.fail(project.id, 'PROJECT_SLUGS has no slug for this project');
        continue;
      }
      let dto: CreateProjectDto;
      try {
        const categorySlug = PROJECT_CATEGORIES.find((category) =>
          category.sourceLabels.includes(project.categoryLabel?.en ?? ''),
        )?.slug;
        const category = categorySlug
          ? await categoryRows.findOne({ where: { slug: categorySlug } })
          : null;
        const thumbnailId = await context.media.idFor(project.thumbnail);
        dto = {
          slug,
          sortOrder: index,
          featured: FEATURED_PROJECT_IDS.includes(project.id),
          categoryId:
            category?.id ??
            (context.options.dryRun && categorySlug ? DRY_RUN_PLACEHOLDER_ID : null),
          thumbnailId,
          galleryMediaIds: thumbnailId ? [thumbnailId] : [],
          technologies: project.techStack,
          demoUrl: project.demoHref,
          hasVideo: project.hasVideo ?? false,
          videoDuration: project.videoDuration ?? null,
          translations: {
            vi: {
              title: project.title.vi,
              summary: project.description.vi,
              descriptionHtml: toParagraphs([project.description.vi]),
            },
            en: {
              title: project.title.en,
              summary: project.description.en,
              descriptionHtml: toParagraphs([project.description.en]),
            },
          },
        };
      } catch (error) {
        builder.fail(project.id, error);
        continue;
      }
      await builder.item(`project ${slug}`, {
        exists: () => projectRows.exists({ where: { slug }, withDeleted: true }),
        create: async () => {
          const created = await projectService.create(dto, owner);
          await projectService.changeStatus(created.id, PublicationStatus.PUBLISHED);
        },
        validate: () => assertValidDto(CreateProjectDto, dto),
      });
    }

    builder.reportUnresolvedMedia();
    return builder.summary;
  }
}
