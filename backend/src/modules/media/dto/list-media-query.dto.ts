import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum MediaSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME = 'name',
  SIZE = 'size',
}

export enum MediaTypeFilter {
  IMAGE = 'image',
  PDF = 'pdf',
}

export class ListMediaQueryDto extends OmitType(PaginationQueryDto, ['sortBy', 'sortOrder']) {
  @ApiPropertyOptional({ enum: MediaSort, default: MediaSort.NEWEST })
  @IsOptional()
  @IsEnum(MediaSort)
  sort: MediaSort = MediaSort.NEWEST;

  @ApiPropertyOptional({ enum: MediaTypeFilter, description: 'Mime family' })
  @IsOptional()
  @IsEnum(MediaTypeFilter)
  type?: MediaTypeFilter;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  folder?: string;
}
