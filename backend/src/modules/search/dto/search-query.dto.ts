import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import {
  ADMIN_SEARCH_DEFAULT_LIMIT,
  ADMIN_SEARCH_MAX_LIMIT,
  AdminSearchType,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
} from '../constants/search.constants';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Accepts ?types=posts,products as well as ?types=posts&types=products
const toTypeList = ({ value }: { value: unknown }): unknown => {
  const parts = Array.isArray(value) ? value : [value];
  if (!parts.every((part) => typeof part === 'string')) return value;
  return (parts as string[])
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

export class AdminSearchQueryDto {
  @ApiProperty({ minLength: SEARCH_QUERY_MIN_LENGTH, maxLength: SEARCH_QUERY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(SEARCH_QUERY_MIN_LENGTH)
  @MaxLength(SEARCH_QUERY_MAX_LENGTH)
  q!: string;

  @ApiPropertyOptional({
    enum: AdminSearchType,
    isArray: true,
    description: 'Comma separated; defaults to every type the caller may read',
  })
  @IsOptional()
  @Transform(toTypeList)
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(AdminSearchType, { each: true })
  types?: AdminSearchType[];

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ADMIN_SEARCH_MAX_LIMIT,
    default: ADMIN_SEARCH_DEFAULT_LIMIT,
    description: 'Maximum results per type',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_SEARCH_MAX_LIMIT)
  limit: number = ADMIN_SEARCH_DEFAULT_LIMIT;
}

export class PublicSearchQueryDto {
  @ApiProperty({ minLength: SEARCH_QUERY_MIN_LENGTH, maxLength: SEARCH_QUERY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(SEARCH_QUERY_MIN_LENGTH)
  @MaxLength(SEARCH_QUERY_MAX_LENGTH)
  q!: string;

  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = DEFAULT_LOCALE;
}
