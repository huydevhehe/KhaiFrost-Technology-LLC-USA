import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../constants/post-constraints';
import { PostTranslationsInputDto } from './post-translation-input.dto';

export class UpdatePostDto {
  @ApiProperty({
    minimum: 0,
    description: 'Version returned by the last read (optimistic locking)',
  })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by single hyphens' })
  slug?: string;

  @ApiPropertyOptional({
    type: () => PostTranslationsInputDto,
    description: 'Only the locales and fields that are present are changed',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostTranslationsInputDto)
  translations?: PostTranslationsInputDto;

  @ApiPropertyOptional({ nullable: true, description: 'null removes the category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'null removes the cover image' })
  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  authorName?: string;

  @ApiPropertyOptional({ description: 'Requires post:publish. A future date schedules the post' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date;
}
