import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SeoFieldsDto } from '../../../common/dto/seo-fields.dto';
import { DURATION_LABEL_PATTERN, SLUG_PATTERN } from '../constants/project.constants';
import { IsHttpUrlOrSitePath } from '../validators/is-http-url-or-site-path.validator';
import { OptionalText } from './optional-text.decorator';
import { TranslationsOf } from './translations-of';

export class ProjectTranslationDto extends SeoFieldsDto {
  @OptionalText(200) title?: string | null;
  @OptionalText(600) summary?: string | null;
  @OptionalText(50000) descriptionHtml?: string | null;
  @OptionalText(150) industry?: string | null;
}
export class ProjectTranslationsDto extends TranslationsOf(ProjectTranslationDto) {}

export class ProjectSectionTranslationDto {
  @OptionalText(200) heading?: string | null;
  @OptionalText(20000) bodyHtml?: string | null;
}
export class ProjectSectionTranslationsDto extends TranslationsOf(ProjectSectionTranslationDto) {}

export class ProjectSectionInputDto {
  @ApiProperty({ type: ProjectSectionTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectSectionTranslationsDto)
  translations!: ProjectSectionTranslationsDto;
}

// Shared by create and update
export class ProjectContentDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Generated from the vi title when omitted' })
  @IsOptional()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  thumbnailId?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'MediaAsset ids in display order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  galleryMediaIds?: string[];

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientName?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  technologies?: string[];

  @ApiPropertyOptional({ maxLength: 500, nullable: true, example: 'https://demo.example.com' })
  @IsOptional()
  @IsHttpUrlOrSitePath()
  @MaxLength(500)
  demoUrl?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  videoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasVideo?: boolean;

  @ApiPropertyOptional({ example: '02:32', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(DURATION_LABEL_PATTERN, { message: 'videoDuration must look like 02:32' })
  videoDuration?: string | null;

  @ApiPropertyOptional({ example: '2025-06-15', nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'completedAt must be YYYY-MM-DD' })
  completedAt?: string | null;

  @ApiPropertyOptional({ description: 'Needs project:update-any' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000, description: 'Needs project:update-any' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: ProjectTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectTranslationsDto)
  translations?: ProjectTranslationsDto;

  @ApiPropertyOptional({ type: [ProjectSectionInputDto], maxItems: 20 })
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProjectSectionInputDto)
  sections?: ProjectSectionInputDto[];
}

export class CreateProjectDto extends ProjectContentDto {}

export class UpdateProjectDto extends ProjectContentDto {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @IsInt()
  @Min(1)
  version!: number;
}
