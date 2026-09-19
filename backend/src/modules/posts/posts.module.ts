import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from '../media/entities/media-asset.entity';
import { MediaModule } from '../media/media.module';
import { PostCategoriesAdminController } from './controllers/post-categories-admin.controller';
import { PostCategoriesPublicController } from './controllers/post-categories-public.controller';
import { PostsAdminController } from './controllers/posts-admin.controller';
import { PostsPublicController } from './controllers/posts-public.controller';
import { PostCategoryTranslation } from './entities/post-category-translation.entity';
import { PostCategory } from './entities/post-category.entity';
import { PostTranslation } from './entities/post-translation.entity';
import { Post } from './entities/post.entity';
import { PostCategoriesService } from './services/post-categories.service';
import { PostMediaService } from './services/post-media.service';
import { PostsAdminService } from './services/posts-admin.service';
import { PostsService } from './services/posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostTranslation,
      PostCategory,
      PostCategoryTranslation,
      MediaAsset,
    ]),
    MediaModule,
  ],
  controllers: [
    PostsAdminController,
    PostsPublicController,
    PostCategoriesAdminController,
    PostCategoriesPublicController,
  ],
  providers: [PostsAdminService, PostsService, PostCategoriesService, PostMediaService],
  exports: [PostsService],
})
export class PostsModule {}
