import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NavigationLinkType } from '../constants/navigation-link-type';

export class NavigationLabelDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

export class NavigationLabelsDto {
  @ApiProperty({ type: NavigationLabelDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NavigationLabelDto)
  vi!: NavigationLabelDto;

  @ApiProperty({ type: NavigationLabelDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NavigationLabelDto)
  en!: NavigationLabelDto;
}

export class NavigationItemInputDto {
  @ApiPropertyOptional({ description: 'Existing item id to keep stable across saves' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: NavigationLinkType })
  @IsEnum(NavigationLinkType)
  linkType!: NavigationLinkType;

  @ApiPropertyOptional({ description: 'Required for linkType page' })
  @IsOptional()
  @IsUUID()
  pageId?: string | null;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'https url for external, /relative path for path',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty({ type: NavigationLabelsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NavigationLabelsDto)
  translations!: NavigationLabelsDto;

  @ApiPropertyOptional({ type: () => [NavigationItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => NavigationItemInputDto)
  children?: NavigationItemInputDto[];
}

export class ReplaceNavigationDto {
  @ApiProperty({ minimum: 0, description: '0 when the menu does not exist yet' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @ApiProperty({
    type: [NavigationItemInputDto],
    description: 'The whole tree; array order is the sort order',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => NavigationItemInputDto)
  items!: NavigationItemInputDto[];
}
