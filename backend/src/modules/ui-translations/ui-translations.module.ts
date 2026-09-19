import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UiTranslationsAdminController } from './controllers/ui-translations-admin.controller';
import { UiTranslationsPublicController } from './controllers/ui-translations-public.controller';
import { UiTranslation } from './entities/ui-translation.entity';
import { UiTranslationBundleService } from './services/ui-translation-bundle.service';
import { UiTranslationsService } from './services/ui-translations.service';

@Module({
  imports: [TypeOrmModule.forFeature([UiTranslation])],
  controllers: [UiTranslationsAdminController, UiTranslationsPublicController],
  providers: [UiTranslationsService, UiTranslationBundleService],
  exports: [UiTranslationsService],
})
export class UiTranslationsModule {}
