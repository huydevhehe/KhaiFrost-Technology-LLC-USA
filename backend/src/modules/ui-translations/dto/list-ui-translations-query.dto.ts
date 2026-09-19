import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { UI_TRANSLATION_NAMESPACE_PATTERN } from './create-ui-translation.dto';

export enum MissingLocaleFilter {
  VI = 'vi',
  EN = 'en',
  ANY = 'any',
}

export class ListUiTranslationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(UI_TRANSLATION_NAMESPACE_PATTERN)
  namespace?: string;

  @ApiPropertyOptional({
    enum: MissingLocaleFilter,
    description: 'Only entries whose text is empty in the given locale (or in any locale)',
  })
  @IsOptional()
  @IsEnum(MissingLocaleFilter)
  missing?: MissingLocaleFilter;
}

export class ListMissingUiTranslationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(UI_TRANSLATION_NAMESPACE_PATTERN)
  namespace?: string;

  @ApiPropertyOptional({ enum: Locale, description: 'Restrict to one missing locale' })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
