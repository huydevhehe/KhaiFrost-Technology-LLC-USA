import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from '../media/entities/media-asset.entity';
import { MediaReferenceService } from '../media/services/media-reference.service';
import { TestimonialsAdminController } from './controllers/testimonials-admin.controller';
import { TestimonialsPublicController } from './controllers/testimonials-public.controller';
import { TestimonialTranslation } from './entities/testimonial-translation.entity';
import { Testimonial } from './entities/testimonial.entity';
import { TestimonialsService } from './services/testimonials.service';

export const TESTIMONIAL_ENTITIES = [Testimonial, TestimonialTranslation];

@Module({
  imports: [TypeOrmModule.forFeature([...TESTIMONIAL_ENTITIES, MediaAsset])],
  controllers: [TestimonialsAdminController, TestimonialsPublicController],
  providers: [MediaReferenceService, TestimonialsService],
})
export class TestimonialsModule {}
