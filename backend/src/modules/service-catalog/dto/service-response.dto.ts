import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';

type Loose = Record<string, unknown>;

export class ServiceCategoryListItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() iconKey!: string;
  @ApiProperty({ description: 'Title per locale (empty when the locale is not written yet)' })
  titles!: { vi: string; en: string };
  @ApiPropertyOptional({ nullable: true }) coverImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: Date;
}

export class ServiceCategoryDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() iconKey!: string;
  @ApiPropertyOptional({ nullable: true }) coverImageId!: string | null;
  @ApiPropertyOptional({ nullable: true }) coverImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) heroImageId!: string | null;
  @ApiPropertyOptional({ nullable: true }) heroImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) createdById!: string | null;
  @ApiProperty({ description: '{ vi?: {...}, en?: {...} } including SEO fields' })
  translations!: Loose;
  @ApiProperty({ type: [Object] }) stats!: Loose[];
  @ApiProperty({ type: [Object] }) products!: Loose[];
  @ApiProperty({ type: [Object] }) processSteps!: Loose[];
  @ApiProperty({ type: [Object] }) whyUs!: Loose[];
  @ApiProperty({ type: [Object] }) caseStudies!: Loose[];
  @ApiProperty({ type: [Object] }) testimonials!: Loose[];
  @ApiProperty({ type: [Object] }) faq!: Loose[];
  @ApiPropertyOptional({ nullable: true }) partnerBanner!: Loose | null;
}

export class ServicesOverviewAdminResponseDto {
  @ApiProperty({ type: [Object] }) stats!: Loose[];
  @ApiProperty({ type: [Object] }) processSteps!: Loose[];
  @ApiProperty({ type: [Object] }) highlights!: Loose[];
}

export class PublicServiceCardResponseDto {
  @ApiProperty() slug!: string;
  @ApiProperty() iconKey!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
}

export class PublicServiceDetailResponseDto extends PublicServiceCardResponseDto {
  @ApiProperty() categoryName!: string;
  @ApiProperty() heroTitle!: string;
  @ApiProperty() heroSubtitle!: string;
  @ApiPropertyOptional({ nullable: true }) heroImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) productsEyebrow!: string | null;
  @ApiPropertyOptional({ nullable: true }) productsHeading!: string | null;
  @ApiPropertyOptional({ nullable: true }) productsIntro!: string | null;
  @ApiProperty({ nullable: true }) seo!: Loose | null;
  @ApiProperty({ type: [Object] }) stats!: Loose[];
  @ApiProperty({ type: [Object] }) products!: Loose[];
  @ApiProperty({ type: [Object] }) processSteps!: Loose[];
  @ApiProperty({ type: [Object] }) whyUs!: Loose[];
  @ApiProperty({ type: [Object] }) caseStudies!: Loose[];
  @ApiProperty({ type: [Object] }) testimonials!: Loose[];
  @ApiProperty({ type: [Object] }) faq!: Loose[];
  @ApiPropertyOptional({ nullable: true }) partnerBanner!: Loose | null;
}

export class PublicServicesOverviewResponseDto {
  @ApiProperty({ type: [PublicServiceCardResponseDto] }) services!: PublicServiceCardResponseDto[];
  @ApiProperty({ type: [Object] }) stats!: Loose[];
  @ApiProperty({ type: [Object] }) processSteps!: Loose[];
  @ApiProperty({ type: [Object] }) highlights!: Loose[];
}
