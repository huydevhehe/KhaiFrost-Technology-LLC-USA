import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { SortOrder } from '../../../common/enums/sort-order.enum';

export const SERVICE_CATEGORY_SORT_FIELDS = [
  'sortOrder',
  'createdAt',
  'updatedAt',
  'slug',
  'status',
] as const;

export class ListServiceCategoriesQueryDto extends PaginationQueryDto {
  sortOrder: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
