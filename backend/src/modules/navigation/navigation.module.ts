import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Page } from '../pages/entities/page.entity';
import { NavigationAdminController } from './controllers/navigation-admin.controller';
import { NavigationPublicController } from './controllers/navigation-public.controller';
import { NavigationItemTranslation } from './entities/navigation-item-translation.entity';
import { NavigationItem } from './entities/navigation-item.entity';
import { NavigationMenu } from './entities/navigation-menu.entity';
import { NavigationService } from './services/navigation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NavigationMenu, NavigationItem, NavigationItemTranslation, Page]),
  ],
  controllers: [NavigationAdminController, NavigationPublicController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
