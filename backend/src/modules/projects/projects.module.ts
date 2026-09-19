import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from '../media/entities/media-asset.entity';
import { MediaReferenceService } from '../media/services/media-reference.service';
import { ProjectCategoriesAdminController } from './controllers/project-categories-admin.controller';
import { ProjectsAdminController } from './controllers/projects-admin.controller';
import { ProjectsPublicController } from './controllers/projects-public.controller';
import { ProjectCategoryTranslation } from './entities/project-category-translation.entity';
import { ProjectCategory } from './entities/project-category.entity';
import { ProjectImage } from './entities/project-image.entity';
import { ProjectSectionTranslation } from './entities/project-section-translation.entity';
import { ProjectSection } from './entities/project-section.entity';
import { ProjectTranslation } from './entities/project-translation.entity';
import { Project } from './entities/project.entity';
import { ProjectCategoriesService } from './services/project-categories.service';
import { ProjectsService } from './services/projects.service';
import { PublicProjectsService } from './services/public-projects.service';

export const PROJECT_ENTITIES = [
  Project,
  ProjectTranslation,
  ProjectImage,
  ProjectSection,
  ProjectSectionTranslation,
  ProjectCategory,
  ProjectCategoryTranslation,
];

@Module({
  imports: [TypeOrmModule.forFeature([...PROJECT_ENTITIES, MediaAsset])],
  controllers: [
    ProjectsAdminController,
    ProjectCategoriesAdminController,
    ProjectsPublicController,
  ],
  providers: [
    MediaReferenceService,
    ProjectsService,
    ProjectCategoriesService,
    PublicProjectsService,
  ],
})
export class ProjectsModule {}
