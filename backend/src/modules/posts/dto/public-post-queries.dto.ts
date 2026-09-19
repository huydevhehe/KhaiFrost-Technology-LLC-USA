import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../constants/post-constraints';
import { toOptionalBoolean } from './list-posts-query.dto';

export enum PublicPostSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class PublicPostListQueryDto extends IntersectionType(PaginationQueryDto, LocaleQueryDto) {
  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN)
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'true returns only featured articles' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: PublicPostSort, default: PublicPostSort.NEWEST })
  @IsOptional()
  @IsEnum(PublicPostSort)
  sort: PublicPostSort = PublicPostSort.NEWEST;
}
