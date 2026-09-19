import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from './create-product.dto';

export class ProductCategoryTranslationInputDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class ProductCategoryTranslationPatchDto extends PartialType(
  ProductCategoryTranslationInputDto,
) {}

export class ProductCategoryTranslationsInputDto {
  @ApiProperty({ type: ProductCategoryTranslationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationInputDto)
  vi!: ProductCategoryTranslationInputDto;

  @ApiProperty({ type: ProductCategoryTranslationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationInputDto)
  en!: ProductCategoryTranslationInputDto;
}

export class ProductCategoryTranslationsPatchDto {
  @ApiPropertyOptional({ type: ProductCategoryTranslationPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationPatchDto)
  vi?: ProductCategoryTranslationPatchDto;

  @ApiPropertyOptional({ type: ProductCategoryTranslationPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationPatchDto)
  en?: ProductCategoryTranslationPatchDto;
}

export class CreateProductCategoryDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Generated from the vi name when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: ProductCategoryTranslationsInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationsInputDto)
  translations!: ProductCategoryTranslationsInputDto;
}

export class UpdateProductCategoryDto extends PartialType(
  OmitType(CreateProductCategoryDto, ['translations']),
) {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ type: ProductCategoryTranslationsPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductCategoryTranslationsPatchDto)
  translations?: ProductCategoryTranslationsPatchDto;
}
