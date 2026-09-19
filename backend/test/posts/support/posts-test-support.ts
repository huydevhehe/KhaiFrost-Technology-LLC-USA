import { User } from '../../../src/modules/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request, { Response } from 'supertest';
import { Role } from '../../../src/common/enums/role.enum';
import { MediaAsset } from '../../../src/modules/media/entities/media-asset.entity';
import { MediaModule } from '../../../src/modules/media/media.module';
import { MediaReferenceService } from '../../../src/modules/media/services/media-reference.service';
import { PostCategoryTranslation } from '../../../src/modules/posts/entities/post-category-translation.entity';
import { PostCategory } from '../../../src/modules/posts/entities/post-category.entity';
import { PostTranslation } from '../../../src/modules/posts/entities/post-translation.entity';
import { Post } from '../../../src/modules/posts/entities/post.entity';
import { PostsModule } from '../../../src/modules/posts/posts.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../../support/create-module-testing-context';
import { asTestUser } from '../../support/test-authentication.guard';

// Keeps the tests independent of whatever else the media module grows to import
@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  providers: [MediaReferenceService],
  exports: [MediaReferenceService, TypeOrmModule],
})
class TestMediaModule {}

export function createPostsTestContext(): Promise<ModuleTestingContext> {
  return createModuleTestingContext({
    entities: [MediaAsset, User, Post, PostTranslation, PostCategory, PostCategoryTranslation],
    imports: [PostsModule],
    customize: (builder) => builder.overrideModule(MediaModule).useModule(TestMediaModule),
  });
}

export const USERS = {
  owner: { id: '00000000-0000-4000-8000-0000000000a1', role: Role.OWNER },
  admin: { id: '00000000-0000-4000-8000-0000000000a2', role: Role.ADMIN },
  staff: { id: '00000000-0000-4000-8000-0000000000b1', role: Role.STAFF },
  otherStaff: { id: '00000000-0000-4000-8000-0000000000b2', role: Role.STAFF },
  customer: { id: '00000000-0000-4000-8000-0000000000c1', role: Role.CUSTOMER },
} as const;

export type TestActor = (typeof USERS)[keyof typeof USERS];

export const ADMIN = '/api/v1/admin';
export const PUBLIC = '/api/v1/public';

export class PostsApi {
  constructor(private readonly context: ModuleTestingContext) {}

  private get server() {
    return this.context.app.getHttpServer();
  }

  get(path: string, actor?: TestActor) {
    const call = request(this.server).get(path);
    return actor ? call.set(asTestUser(actor)) : call;
  }

  post(path: string, actor?: TestActor, body?: object) {
    const call = request(this.server).post(path);
    if (actor) call.set(asTestUser(actor));
    return body ? call.send(body) : call;
  }

  patch(path: string, actor: TestActor | undefined, body: object) {
    const call = request(this.server).patch(path);
    if (actor) call.set(asTestUser(actor));
    return call.send(body);
  }

  delete(path: string, actor?: TestActor) {
    const call = request(this.server).delete(path);
    return actor ? call.set(asTestUser(actor)) : call;
  }

  async createCategory(name: { vi: string; en: string }, extra: object = {}): Promise<string> {
    const response = await this.post(`${ADMIN}/post-categories`, USERS.admin, {
      translations: { vi: { name: name.vi }, en: { name: name.en } },
      ...extra,
    }).expect(201);
    return response.body.data.id as string;
  }

  async createPost(
    body: object,
    actor: TestActor = USERS.admin,
  ): Promise<Response['body']['data']> {
    const response = await this.post(`${ADMIN}/posts`, actor, body).expect(201);
    return response.body.data;
  }

  // Creates a post with both languages and publishes it (a future publishedAt makes it scheduled)
  async createPublishedPost(
    title: { vi: string; en: string },
    options: {
      publishedAt?: string;
      categoryId?: string;
      isFeatured?: boolean;
      slug?: string;
      tags?: { vi?: string[]; en?: string[] };
      coverImageId?: string;
    } = {},
  ): Promise<Response['body']['data']> {
    const created = await this.createPost({
      slug: options.slug,
      categoryId: options.categoryId,
      isFeatured: options.isFeatured,
      coverImageId: options.coverImageId,
      translations: {
        vi: {
          title: title.vi,
          excerpt: `Tóm tắt ${title.vi}`,
          contentHtml: `<p>Nội dung ${title.vi}</p>`,
          tags: options.tags?.vi,
        },
        en: {
          title: title.en,
          excerpt: `Summary of ${title.en}`,
          contentHtml: `<p>Body of ${title.en}</p>`,
          tags: options.tags?.en,
        },
      },
    });
    const response = await this.post(`${ADMIN}/posts/${created.id}/publish`, USERS.admin, {
      publishedAt: options.publishedAt,
    }).expect(200);
    return response.body.data;
  }
}

export async function insertMediaAsset(
  context: ModuleTestingContext,
  name: string,
  withThumbnail = true,
): Promise<string> {
  const repository = context.dataSource.getRepository(MediaAsset);
  const asset = await repository.save(
    repository.create({
      originalName: `${name}.webp`,
      storageKey: `2026/01/${name}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 1000,
      width: 1600,
      height: 900,
      checksumSha256: 'a'.repeat(64),
      folder: null,
      variants: withThumbnail
        ? {
            thumb: {
              storageKey: `2026/01/${name}-thumb.webp`,
              width: 320,
              height: 180,
              sizeBytes: 100,
              mimeType: 'image/webp',
            },
          }
        : {},
    }),
  );
  return asset.id;
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
