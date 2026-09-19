import {
  TestimonialAdminResponseDto,
  TestimonialPublicResponseDto,
} from '../dto/testimonial-response.dto';
import { TestimonialTranslation } from '../entities/testimonial-translation.entity';
import { Testimonial } from '../entities/testimonial.entity';

export function toAdminTestimonial(
  testimonial: Testimonial,
  translations: TestimonialTranslation[],
  urls: Map<string, string>,
): TestimonialAdminResponseDto {
  const byLocale: TestimonialAdminResponseDto['translations'] = {};
  for (const row of translations) {
    byLocale[row.locale] = { quote: row.quote, authorRole: row.authorRole };
  }
  return {
    id: testimonial.id,
    authorName: testimonial.authorName,
    company: testimonial.company,
    location: testimonial.location,
    rating: testimonial.rating,
    status: testimonial.status,
    sortOrder: testimonial.sortOrder,
    avatarId: testimonial.avatarId,
    avatarUrl: testimonial.avatarId ? (urls.get(testimonial.avatarId) ?? null) : null,
    version: testimonial.version,
    createdAt: testimonial.createdAt,
    updatedAt: testimonial.updatedAt,
    createdById: testimonial.createdById,
    translations: byLocale,
  };
}

export function toPublicTestimonial(
  testimonial: Testimonial,
  translation: TestimonialTranslation | undefined,
  urls: Map<string, string>,
): TestimonialPublicResponseDto {
  return {
    id: testimonial.id,
    authorName: testimonial.authorName,
    company: testimonial.company,
    location: testimonial.location,
    rating: testimonial.rating,
    avatarUrl: testimonial.avatarId ? (urls.get(testimonial.avatarId) ?? null) : null,
    quote: translation?.quote ?? '',
    authorRole: translation?.authorRole ?? null,
  };
}
