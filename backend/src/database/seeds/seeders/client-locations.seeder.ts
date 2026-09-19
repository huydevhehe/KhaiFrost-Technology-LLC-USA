import { CreateClientLocationDto } from '../../../modules/client-locations/dto/client-location.dto';
import {
  ClientLocation,
  ClientLocationStatus,
} from '../../../modules/client-locations/entities/client-location.entity';
import { ClientLocationsService } from '../../../modules/client-locations/services/client-locations.service';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

export class ClientLocationsSeeder implements Seeder {
  readonly name = 'client-locations';
  readonly description = 'Clients shown on the world map (published)';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const service = context.services.get(ClientLocationsService);
    const rows = context.dataSource.getRepository(ClientLocation);

    for (const source of context.content.clientLocations()) {
      // role and country only exist in English in the source, so both locales receive that text
      const dto: CreateClientLocationDto = {
        name: source.name,
        x: source.x,
        y: source.y,
        status: ClientLocationStatus.PUBLISHED,
        avatarId: await context.media.idFor(source.avatar),
        coverImageId: await context.media.idFor(source.coverImage),
        translations: {
          vi: { quote: source.quote.vi, role: source.role, country: source.country },
          en: { quote: source.quote.en, role: source.role, country: source.country },
        },
      };
      await builder.item(`client location ${source.id}`, {
        exists: () =>
          rows.exists({
            where: { name: source.name, x: source.x, y: source.y },
            withDeleted: true,
          }),
        create: () => service.create(dto),
        validate: () => assertValidDto(CreateClientLocationDto, dto),
      });
    }
    builder.reportUnresolvedMedia();
    return builder.summary;
  }
}
