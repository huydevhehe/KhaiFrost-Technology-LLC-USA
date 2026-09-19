import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { SettingsAdminController } from './controllers/settings-admin.controller';
import { SettingsPublicController } from './controllers/settings-public.controller';
import { SiteSettingMedia } from './entities/site-setting-media.entity';
import { SiteSetting } from './entities/site-setting.entity';
import { SettingsService } from './services/settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting, SiteSettingMedia]), MediaModule],
  controllers: [SettingsAdminController, SettingsPublicController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
