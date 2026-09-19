import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SeoFieldsDto } from '../../../common/dto/seo-fields.dto';

export class ProductTranslationInputDto extends SeoFieldsDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string | null;

  @ApiPropertyOptional({
    maxLength: 100000,
    description: 'Rich text, sanitized on save',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  descriptionHtml?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Up to 30 bullet points' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  features?: string[];
}

export class ProductTranslationPatchDto extends PartialType(ProductTranslationInputDto) {}

export class ProductTranslationsInputDto {
  @ApiProperty({ type: ProductTranslationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductTranslationInputDto)
  vi!: ProductTranslationInputDto;

  @ApiPropertyOptional({ type: ProductTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationInputDto)
  en?: ProductTranslationInputDto;
}

export class ProductTranslationsPatchDto {
  @ApiPropertyOptional({ type: ProductTranslationPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationPatchDto)
  vi?: ProductTranslationPatchDto;

  @ApiPropertyOptional({ type: ProductTranslationPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationPatchDto)
  en?: ProductTranslationPatchDto;
}
