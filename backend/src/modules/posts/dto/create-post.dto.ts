import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../constants/post-constraints';
import { PostTranslationsInputDto } from './post-translation-input.dto';

export class CreatePostDto {
  @ApiPropertyOptional({
    maxLength: SLUG_MAX_LENGTH,
    description: 'Generated from the title when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by single hyphens' })
  slug?: string;

  @ApiProperty({ type: () => PostTranslationsInputDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PostTranslationsInputDto)
  translations!: PostTranslationsInputDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ maxLength: 150, description: 'Byline; defaults to the company name' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  authorName?: string;
}
