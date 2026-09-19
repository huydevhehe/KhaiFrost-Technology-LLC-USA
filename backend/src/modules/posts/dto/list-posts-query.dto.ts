import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';

export const POST_DATE_FIELDS = ['updatedAt', 'publishedAt'] as const;
export type PostDateField = (typeof POST_DATE_FIELDS)[number];

export function toOptionalBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class ListPostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: POST_DATE_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsEnum(POST_DATE_FIELDS)
  dateField: PostDateField = 'updatedAt';

  @ApiPropertyOptional({ description: 'Inclusive lower bound of dateField' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Inclusive upper bound of dateField' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({
    enum: Locale,
    description: 'Only posts that cannot be published yet because this language is incomplete',
  })
  @IsOptional()
  @IsEnum(Locale)
  missingLocale?: Locale;

  @ApiPropertyOptional({ enum: Locale, default: Locale.VI, description: 'Language of `title`' })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = Locale.VI;
}
