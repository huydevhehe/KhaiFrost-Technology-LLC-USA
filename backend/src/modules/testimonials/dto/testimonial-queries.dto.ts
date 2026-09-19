import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { SortOrder } from '../../../common/enums/sort-order.enum';
import { TestimonialStatus } from '../entities/testimonial.entity';

export const TESTIMONIAL_SORT_FIELDS = ['sortOrder', 'createdAt', 'updatedAt', 'rating'] as const;

export class ListTestimonialsQueryDto extends PaginationQueryDto {
  sortOrder: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ enum: TestimonialStatus })
  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;
}

export class PublicTestimonialsQueryDto {
  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = DEFAULT_LOCALE;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 50;
}

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];
}
