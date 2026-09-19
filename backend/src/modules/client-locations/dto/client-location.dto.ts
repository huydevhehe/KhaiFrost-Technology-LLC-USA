import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { SortOrder } from '../../../common/enums/sort-order.enum';
import { ClientLocationStatus } from '../entities/client-location.entity';
import { OptionalText } from './optional-text.decorator';
import { TranslationsOf } from './translations-of';

export class ClientLocationTranslationDto {
  @OptionalText(1000) quote?: string | null;
  @OptionalText(200) role?: string | null;
  @OptionalText(120) country?: string | null;
}
export class ClientLocationTranslationsDto extends TranslationsOf(ClientLocationTranslationDto) {}

class ClientLocationFieldsDto {
  @ApiPropertyOptional({ minimum: -90, maximum: 90, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ enum: ClientLocationStatus })
  @IsOptional()
  @IsEnum(ClientLocationStatus)
  status?: ClientLocationStatus;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  avatarId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional({ type: ClientLocationTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientLocationTranslationsDto)
  translations?: ClientLocationTranslationsDto;
}

export class CreateClientLocationDto extends ClientLocationFieldsDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  x!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  y!: number;
}

export class UpdateClientLocationDto extends ClientLocationFieldsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  x?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  y?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}

export class ListClientLocationsQueryDto extends PaginationQueryDto {
  sortOrder: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ enum: ClientLocationStatus })
  @IsOptional()
  @IsEnum(ClientLocationStatus)
  status?: ClientLocationStatus;
}

export const CLIENT_LOCATION_SORT_FIELDS = ['sortOrder', 'createdAt', 'updatedAt', 'name'] as const;

export class PublicClientLocationsQueryDto {
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

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 100;
}

export class ReorderClientLocationsDto {
  @ApiProperty({ type: [String] })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];
}

export class ClientLocationAdminResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() x!: number;
  @ApiProperty() y!: number;
  @ApiPropertyOptional({ nullable: true }) latitude!: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude!: number | null;
  @ApiProperty({ enum: ClientLocationStatus }) status!: ClientLocationStatus;
  @ApiProperty() sortOrder!: number;
  @ApiPropertyOptional({ nullable: true }) avatarId!: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) coverImageId!: string | null;
  @ApiPropertyOptional({ nullable: true }) coverImageUrl!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ description: '{ vi?: { quote, role, country }, en?: {...} }' })
  translations!: Record<string, { quote: string; role: string; country: string }>;
}

export class ClientLocationPublicResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() role!: string;
  @ApiProperty() country!: string;
  @ApiProperty() quote!: string;
  @ApiProperty() x!: number;
  @ApiProperty() y!: number;
  @ApiPropertyOptional({ nullable: true }) latitude!: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude!: number | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) coverImageUrl!: string | null;
}
