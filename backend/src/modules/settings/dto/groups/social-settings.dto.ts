import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SocialLinkDto {
  @ApiProperty({ maxLength: 30, example: 'linkedin' })
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, { message: 'network must be lowercase letters, digits or dashes' })
  network!: string;

  @ApiProperty({ maxLength: 500 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;
}

export class SocialSettingsDto {
  @ApiProperty({ type: [SocialLinkDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  links!: SocialLinkDto[];
}
