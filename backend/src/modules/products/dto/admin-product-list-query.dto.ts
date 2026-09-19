import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { ProductType } from '../enums/product-type.enum';
import { toBooleanFlag } from './query-transforms';

export const ADMIN_PRODUCT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'sortOrder',
  'slug',
  'status',
  'type',
] as const;

export class AdminProductListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBooleanFlag)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    enum: Locale,
    description: 'Only products whose name, tagline or description is empty in this locale',
  })
  @IsOptional()
  @IsEnum(Locale)
  missingLocale?: Locale;
}
