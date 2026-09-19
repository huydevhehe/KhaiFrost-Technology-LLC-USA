import { CreateTestimonialDto } from '../../../modules/testimonials/dto/testimonial-input.dto';
import {
  Testimonial,
  TestimonialStatus,
} from '../../../modules/testimonials/entities/testimonial.entity';
import { TestimonialsService } from '../../../modules/testimonials/services/testimonials.service';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

export class TestimonialsSeeder implements Seeder {
  readonly name = 'testimonials';
  readonly description = 'Customer testimonials (published)';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const owner = context.owner;
    if (!owner) {
      builder.fail('owner', 'No owner user is available');
      return builder.summary;
    }
    const service = context.services.get(TestimonialsService);
    const rows = context.dataSource.getRepository(Testimonial);

    for (const source of context.content.testimonials()) {
      // The source "role" is a place ("Vietnam", "Remote"), so it maps to the location column
      const dto: CreateTestimonialDto = {
        authorName: source.name,
        location: source.role,
        rating: 5,
        status: TestimonialStatus.PUBLISHED,
        avatarId: await context.media.idFor(source.thumbnail),
        translations: { vi: { quote: source.quote.vi }, en: { quote: source.quote.en } },
      };
      await builder.item(`testimonial ${source.id}`, {
        exists: () =>
          rows.exists({
            where: { authorName: source.name, location: source.role },
            withDeleted: true,
          }),
        create: () => service.create(dto, owner),
        validate: () => assertValidDto(CreateTestimonialDto, dto),
      });
    }
    builder.reportUnresolvedMedia();
    return builder.summary;
  }
}
