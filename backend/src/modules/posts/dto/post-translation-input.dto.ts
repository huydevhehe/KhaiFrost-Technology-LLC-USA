import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SeoFieldsDto } from '../../../common/dto/seo-fields.dto';

export class PostTranslationInputDto extends SeoFieldsDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    maxLength: 600,
    description: 'Plain text; derived from the content when left empty',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  excerpt?: string;

  @ApiPropertyOptional({ maxLength: 200000, description: 'HTML; sanitized before it is stored' })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  contentHtml?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class PostTranslationsInputDto {
  @ApiPropertyOptional({ type: () => PostTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostTranslationInputDto)
  vi?: PostTranslationInputDto;

  @ApiPropertyOptional({ type: () => PostTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostTranslationInputDto)
  en?: PostTranslationInputDto;
}
