import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';

type Loose = Record<string, unknown>;

export class ProjectCategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ description: '{ vi?: { name }, en?: { name } }' })
  translations!: Record<string, { name: string }>;
}

export class PublicProjectCategoryResponseDto {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Published projects in this category' }) projectCount!: number;
}

export class ProjectListItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() featured!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiPropertyOptional({ nullable: true }) categoryId!: string | null;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiProperty() titles!: { vi: string; en: string };
  @ApiPropertyOptional({ nullable: true }) createdById!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: Date;
}

export class ProjectDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: PublicationStatus }) status!: PublicationStatus;
  @ApiProperty() featured!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiPropertyOptional({ nullable: true }) categoryId!: string | null;
  @ApiPropertyOptional({ nullable: true }) thumbnailId!: string | null;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) clientName!: string | null;
  @ApiProperty({ type: [String] }) technologies!: string[];
  @ApiPropertyOptional({ nullable: true }) demoUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) videoUrl!: string | null;
  @ApiProperty() hasVideo!: boolean;
  @ApiPropertyOptional({ nullable: true }) videoDuration!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty({ type: [Object], description: '[{ mediaAssetId, url, sortOrder }]' })
  gallery!: Loose[];
  @ApiProperty({ type: [Object] }) sections!: Loose[];
  @ApiProperty({ description: '{ vi?: {...}, en?: {...} } including SEO fields' })
  translations!: Loose;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) createdById!: string | null;
}

export class PublicProjectCardResponseDto {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) category!: { slug: string; name: string } | null;
  @ApiProperty({ type: [String] }) technologies!: string[];
  @ApiPropertyOptional({ nullable: true }) demoUrl!: string | null;
  @ApiProperty() hasVideo!: boolean;
  @ApiPropertyOptional({ nullable: true }) videoDuration!: string | null;
  @ApiProperty() featured!: boolean;
  @ApiPropertyOptional({ nullable: true }) clientName!: string | null;
  @ApiPropertyOptional({ nullable: true }) industry!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: string | null;
}

export class PublicProjectDetailResponseDto extends PublicProjectCardResponseDto {
  @ApiProperty() descriptionHtml!: string;
  @ApiPropertyOptional({ nullable: true }) videoUrl!: string | null;
  @ApiProperty({ type: [Object], description: '[{ url }]' }) gallery!: Loose[];
  @ApiProperty({ type: [Object], description: '[{ heading, bodyHtml }]' }) sections!: Loose[];
  @ApiProperty({ nullable: true }) seo!: Loose | null;
}
