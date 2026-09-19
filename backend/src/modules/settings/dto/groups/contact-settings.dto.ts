import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export const CONTACT_CHANNEL_TYPES = [
  'email',
  'phone',
  'zalo',
  'whatsapp',
  'telegram',
  'messenger',
  'other',
] as const;

export class ContactChannelDto {
  @ApiProperty({ enum: CONTACT_CHANNEL_TYPES })
  @IsIn(CONTACT_CHANNEL_TYPES)
  type!: (typeof CONTACT_CHANNEL_TYPES)[number];

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value!: string;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label?: LocalizedTextDto;
}

export class OfficeLocationDto {
  @ApiProperty({ maxLength: 60, example: 'office-usa' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, { message: 'id must be lowercase letters, digits or dashes' })
  id!: string;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label!: LocalizedTextDto;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  street!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  state?: string | null;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string | null;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  country!: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be an ISO 3166-1 alpha-2 code' })
  countryCode!: string;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description: 'Marker position on the world map, percent',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  mapX?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  mapY?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  imageId?: string | null;
}

export class ContactSettingsDto {
  @ApiProperty({ type: [ContactChannelDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ContactChannelDto)
  channels!: ContactChannelDto[];

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  businessHours?: LocalizedTextDto;

  @ApiProperty({ type: [OfficeLocationDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OfficeLocationDto)
  offices!: OfficeLocationDto[];
}
