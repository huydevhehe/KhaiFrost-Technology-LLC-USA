import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
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
import { DemoMode } from '../enums/demo-mode.enum';
import { ProductType } from '../enums/product-type.enum';
import { ProductPriceInputDto } from './product-price-input.dto';
import { ProductTranslationsInputDto } from './product-translation-input.dto';
import { IsFlatSpecifications } from './validators/is-flat-specifications.validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Generated from the vi name when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiPropertyOptional({ maxLength: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ description: 'MediaAsset id', nullable: true })
  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Ordered MediaAsset ids' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  galleryImageIds?: string[];

  @ApiPropertyOptional({ maxLength: 500, nullable: true, description: 'https only' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  demoUrl?: string | null;

  @ApiPropertyOptional({ enum: DemoMode, default: DemoMode.EXTERNAL })
  @IsOptional()
  @IsEnum(DemoMode)
  demoMode?: DemoMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  techStack?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Flat string/number map, e.g. cpu, ram, storage, bandwidth',
  })
  @IsOptional()
  @IsFlatSpecifications()
  specifications?: Record<string, string | number>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [ProductPriceInputDto], description: 'Replace-all semantics' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  prices?: ProductPriceInputDto[];

  @ApiProperty({ type: ProductTranslationsInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductTranslationsInputDto)
  translations!: ProductTranslationsInputDto;
}
