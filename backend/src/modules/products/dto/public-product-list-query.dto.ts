import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { Currency } from '../enums/currency.enum';
import { ProductType } from '../enums/product-type.enum';
import { toBooleanFlag } from './query-transforms';

export enum PublicProductSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME = 'name',
}

export class PublicProductListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = DEFAULT_LOCALE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/)
  categorySlug?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBooleanFlag)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: PublicProductSort, default: PublicProductSort.NEWEST })
  @IsOptional()
  @IsEnum(PublicProductSort)
  sort: PublicProductSort = PublicProductSort.NEWEST;

  @ApiPropertyOptional({
    enum: Currency,
    default: Currency.USD,
    description:
      'Currency used by the price sorts (prices in different currencies are never compared)',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency: Currency = Currency.USD;
}
