import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from '../media/entities/media-asset.entity';
import { MediaReferenceService } from '../media/services/media-reference.service';
import { ClientLocationsAdminController } from './controllers/client-locations-admin.controller';
import { ClientLocationsPublicController } from './controllers/client-locations-public.controller';
import { ClientLocationTranslation } from './entities/client-location-translation.entity';
import { ClientLocation } from './entities/client-location.entity';
import { ClientLocationsService } from './services/client-locations.service';

export const CLIENT_LOCATION_ENTITIES = [ClientLocation, ClientLocationTranslation];

@Module({
  imports: [TypeOrmModule.forFeature([...CLIENT_LOCATION_ENTITIES, MediaAsset])],
  controllers: [ClientLocationsAdminController, ClientLocationsPublicController],
  providers: [MediaReferenceService, ClientLocationsService],
})
export class ClientLocationsModule {}
