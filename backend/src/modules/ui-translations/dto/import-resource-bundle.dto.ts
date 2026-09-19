import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Locale } from '../../../common/enums/locale.enum';
import { UI_TRANSLATION_NAMESPACE_PATTERN } from './create-ui-translation.dto';

export class ImportResourceBundleDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiProperty({ description: 'Nested i18next JSON for ONE namespace', type: Object })
  @IsObject()
  bundle!: Record<string, unknown>;

  @ApiPropertyOptional({ default: 'translation', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(UI_TRANSLATION_NAMESPACE_PATTERN)
  namespace?: string;

  @ApiPropertyOptional({ default: false, description: 'Replace texts that already exist' })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class ImportResourceBundleResultDto {
  @ApiProperty() created!: number;
  @ApiProperty() updated!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty({ type: [String] }) conflicts!: string[];
  @ApiProperty({ type: [String], description: 'Keys whose vi and en placeholders differ' })
  placeholderMismatches!: string[];
}
