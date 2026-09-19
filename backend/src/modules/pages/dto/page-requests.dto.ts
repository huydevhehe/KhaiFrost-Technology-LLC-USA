import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SeoFieldsDto } from '../../../common/dto/seo-fields.dto';
import { PageStatus } from '../constants/page-status';

const KEBAB_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class ListPagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PageStatus })
  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;
}

export class PageTranslationInputDto extends SeoFieldsDto {
  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;
}

export class PageTranslationsInputDto {
  @ApiPropertyOptional({ type: PageTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageTranslationInputDto)
  vi?: PageTranslationInputDto;

  @ApiPropertyOptional({ type: PageTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageTranslationInputDto)
  en?: PageTranslationInputDto;
}

export class CreatePageDto {
  @ApiProperty({ maxLength: 200, example: '/gioi-thieu' })
  @IsString()
  @MaxLength(200)
  path!: string;

  @ApiPropertyOptional({ maxLength: 60, default: 'generic' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(KEBAB_PATTERN, { message: 'templateKey must be lowercase kebab-case' })
  templateKey?: string;

  @ApiProperty({ type: PageTranslationsInputDto, description: 'vi.title is required' })
  @ValidateNested()
  @Type(() => PageTranslationsInputDto)
  translations!: PageTranslationsInputDto;
}

export class UpdatePageDto {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 200, description: 'Rejected for system pages' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(KEBAB_PATTERN, { message: 'templateKey must be lowercase kebab-case' })
  templateKey?: string;

  @ApiPropertyOptional({ type: PageTranslationsInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageTranslationsInputDto)
  translations?: PageTranslationsInputDto;
}

export class CreateSectionDto {
  @ApiProperty({ maxLength: 60, example: 'hero' })
  @IsString()
  @MaxLength(60)
  type!: string;

  @ApiPropertyOptional({ maxLength: 80, description: 'Generated from the type when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(KEBAB_PATTERN, { message: 'sectionKey must be lowercase kebab-case' })
  sectionKey?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ minimum: 0, description: 'Zero based position; appended when omitted' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object, description: '{ shared, translations: { vi, en } }' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class UpdateSectionDto {
  @ApiProperty({ description: 'Section version last read by the client' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object, description: 'Replaces the whole draft content' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class ReorderSectionsDto {
  @ApiProperty({ type: [String], description: 'Every section id of the page in the new order' })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  sectionIds!: string[];
}

export class PublishPageDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  note?: string;
}

export class RevertRevisionDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  note?: string;
}

export class PublicPageQueryDto extends LocaleQueryDto {
  @ApiProperty({ maxLength: 200, example: '/ve-chung-toi' })
  @IsString()
  @MaxLength(200)
  path!: string;
}
