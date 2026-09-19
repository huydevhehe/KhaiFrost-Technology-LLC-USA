import { ApiProperty } from '@nestjs/swagger';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';

export class MediaReferenceResponse {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() thumbnailUrl!: string;
}

export class LocalizedTitlesResponse {
  @ApiProperty({ nullable: true, type: String }) vi!: string | null;
  @ApiProperty({ nullable: true, type: String }) en!: string | null;
}

export class AdminPostCategoryReferenceResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ description: 'Name in the requested locale' }) name!: string;
}

export class AdminPostListItemResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ description: 'Title in the requested locale, falling back to the other one' })
  title!: string;
  @ApiProperty({ type: () => LocalizedTitlesResponse }) titles!: LocalizedTitlesResponse;
  @ApiProperty({ nullable: true, type: () => AdminPostCategoryReferenceResponse })
  category!: AdminPostCategoryReferenceResponse | null;
  @ApiProperty({ nullable: true, type: String }) coverThumbnailUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) authorId!: string | null;
  @ApiProperty() authorName!: string;
  @ApiProperty({ nullable: true, type: Date }) publishedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: Locale, isArray: true }) missingLocales!: Locale[];
}

export class AdminPostTranslationResponse {
  @ApiProperty() title!: string;
  @ApiProperty() excerpt!: string;
  @ApiProperty() contentHtml!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() readingTimeMinutes!: number;
  @ApiProperty({ nullable: true, type: String }) seoTitle!: string | null;
  @ApiProperty({ nullable: true, type: String }) seoDescription!: string | null;
  @ApiProperty({ nullable: true, type: String }) seoKeywords!: string | null;
  @ApiProperty({ nullable: true, type: String }) canonicalUrl!: string | null;
  @ApiProperty() noIndex!: boolean;
  @ApiProperty({ nullable: true, type: () => MediaReferenceResponse })
  ogImage!: MediaReferenceResponse | null;
}

export class AdminPostTranslationsResponse {
  @ApiProperty({ nullable: true, type: () => AdminPostTranslationResponse })
  vi!: AdminPostTranslationResponse | null;
  @ApiProperty({ nullable: true, type: () => AdminPostTranslationResponse })
  en!: AdminPostTranslationResponse | null;
}

export class AdminPostCategoryNamesResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: () => LocalizedTitlesResponse }) names!: LocalizedTitlesResponse;
}

export class AdminPostDetailResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ nullable: true, type: Date }) publishedAt!: Date | null;
  @ApiProperty({ nullable: true, type: () => AdminPostCategoryNamesResponse })
  category!: AdminPostCategoryNamesResponse | null;
  @ApiProperty({ nullable: true, type: () => MediaReferenceResponse })
  coverImage!: MediaReferenceResponse | null;
  @ApiProperty({ nullable: true, type: String }) authorId!: string | null;
  @ApiProperty() authorName!: string;
  @ApiProperty({ type: () => AdminPostTranslationsResponse })
  translations!: AdminPostTranslationsResponse;
  @ApiProperty({ enum: Locale, isArray: true }) missingLocales!: Locale[];
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdById!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedById!: string | null;
}

export class AdminPostCategoryTranslationResponse {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
}

export class AdminPostCategoryResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true, type: () => AdminPostCategoryTranslationResponse })
  vi!: AdminPostCategoryTranslationResponse | null;
  @ApiProperty({ nullable: true, type: () => AdminPostCategoryTranslationResponse })
  en!: AdminPostCategoryTranslationResponse | null;
  @ApiProperty({ description: 'Non-deleted posts that use this category' }) postCount!: number;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
