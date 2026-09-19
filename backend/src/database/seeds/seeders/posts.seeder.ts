import { CreatePostDto } from '../../../modules/posts/dto/create-post.dto';
import { CreatePostCategoryDto } from '../../../modules/posts/dto/post-category-input.dto';
import { PostCategory } from '../../../modules/posts/entities/post-category.entity';
import { Post } from '../../../modules/posts/entities/post.entity';
import { PostCategoriesService } from '../../../modules/posts/services/post-categories.service';
import { PostsAdminService } from '../../../modules/posts/services/posts-admin.service';
import { POST_CATEGORIES, POSTS } from '../seed-content-mapping';
import { POST_BODY_PARAGRAPHS } from '../seed-generated-content';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { toParagraphs } from '../support/html';
import { DRY_RUN_PLACEHOLDER_ID } from '../support/media-resolver';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

export class PostsSeeder implements Seeder {
  readonly name = 'posts';
  readonly description =
    'Blog categories and posts with generated bodies, published on their original dates';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const owner = context.owner;
    if (!owner) {
      builder.fail('owner', 'No owner user is available');
      return builder.summary;
    }
    const categoryService = context.services.get(PostCategoriesService);
    const postService = context.services.get(PostsAdminService);
    const categoryRows = context.dataSource.getRepository(PostCategory);
    const postRows = context.dataSource.getRepository(Post);

    // The categories of mockBlogPosts.ts are created even when no seeded post uses them
    const sourceCategories = new Set(context.content.adminBlogCategories());
    for (const [index, category] of POST_CATEGORIES.entries()) {
      if (!sourceCategories.has(category.sourceName)) continue;
      const dto = {
        slug: category.slug,
        sortOrder: index,
        translations: { vi: { name: category.vi }, en: { name: category.en } },
      };
      await builder.item(`post category ${category.slug}`, {
        exists: () => categoryRows.exists({ where: { slug: category.slug }, withDeleted: true }),
        create: () => categoryService.create(dto),
        validate: () => assertValidDto(CreatePostCategoryDto, dto),
      });
    }

    const sources = context.content.blogPosts();
    for (const mapping of POSTS) {
      const source = sources.find((candidate) => candidate.id === mapping.sourceId);
      const body = POST_BODY_PARAGRAPHS[mapping.sourceId];
      if (!source || !body) {
        builder.fail(mapping.sourceId, 'The blog post or its generated body is missing');
        continue;
      }
      let dto: CreatePostDto;
      try {
        const categorySlug = POST_CATEGORIES.find(
          (category) => category.sourceName === mapping.categorySourceName,
        )?.slug;
        const category = categorySlug
          ? await categoryRows.findOne({ where: { slug: categorySlug } })
          : null;
        dto = {
          slug: mapping.slug,
          categoryId: category?.id ?? (context.options.dryRun ? DRY_RUN_PLACEHOLDER_ID : null),
          coverImageId: await context.media.idFor(source.thumbnail),
          isFeatured: false,
          translations: {
            vi: {
              title: source.title.vi,
              excerpt: source.excerpt.vi,
              contentHtml: toParagraphs(body.vi),
            },
            en: {
              title: source.title.en,
              excerpt: source.excerpt.en,
              contentHtml: toParagraphs(body.en),
            },
          },
        };
      } catch (error) {
        builder.fail(mapping.sourceId, error);
        continue;
      }
      await builder.item(`post ${mapping.slug}`, {
        exists: () => postRows.exists({ where: { slug: mapping.slug }, withDeleted: true }),
        create: async () => {
          const created = await postService.create(dto, owner);
          await postService.publish(created.id, owner, new Date(mapping.publishedAt));
        },
        validate: () => assertValidDto(CreatePostDto, dto),
      });
    }

    builder.reportUnresolvedMedia();
    return builder.summary;
  }
}
