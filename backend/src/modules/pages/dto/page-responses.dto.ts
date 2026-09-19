import { ApiProperty } from '@nestjs/swagger';

export class PageSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() path!: string;
  @ApiProperty() templateKey!: string;
  @ApiProperty({ enum: ['draft', 'published'] }) status!: string;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ type: Object }) title!: { vi: string | null; en: string | null };
  @ApiProperty({ nullable: true, type: Date }) publishedAt!: Date | null;
  @ApiProperty() currentRevisionNumber!: number;
  @ApiProperty() sectionCount!: number;
  @ApiProperty({ description: 'A visible section has draft content that is not live yet' })
  hasUnpublishedChanges!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: Date;
}

export class PageSectionDto {
  @ApiProperty() id!: string;
  @ApiProperty() sectionKey!: string;
  @ApiProperty() type!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isVisible!: boolean;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ type: Object }) draftContent!: Record<string, unknown>;
  @ApiProperty({ type: Object, nullable: true }) publishedContent!: Record<string, unknown> | null;
  @ApiProperty() hasUnpublishedChanges!: boolean;
  @ApiProperty() updatedAt!: Date;
}

export class PageDetailDto extends PageSummaryDto {
  @ApiProperty({ type: Object, description: '{ vi: { title, seo... }, en: { ... } }' })
  translations!: Record<string, Record<string, unknown>>;
  @ApiProperty({ type: [PageSectionDto] }) sections!: PageSectionDto[];
  @ApiProperty({ type: Object, description: 'Field schemas of the section types used here' })
  sectionTypes!: Record<string, unknown>;
}

export class PageRevisionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdById!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() sectionCount!: number;
}

export class PageRevisionDetailDto extends PageRevisionSummaryDto {
  @ApiProperty({ type: Object }) snapshot!: Record<string, unknown>;
}

export class PublicPageRouteDto {
  @ApiProperty() path!: string;
  @ApiProperty() templateKey!: string;
  @ApiProperty() updatedAt!: Date;
}

export class PublicPageSectionDto {
  @ApiProperty() key!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ type: Object, description: 'Fields flattened to the requested locale' })
  content!: Record<string, unknown>;
}

export class PublicPageDto {
  @ApiProperty() path!: string;
  @ApiProperty() templateKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ type: Object }) seo!: Record<string, unknown>;
  @ApiProperty({ nullable: true, type: Date }) publishedAt!: Date | null;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [PublicPageSectionDto] }) sections!: PublicPageSectionDto[];
}
