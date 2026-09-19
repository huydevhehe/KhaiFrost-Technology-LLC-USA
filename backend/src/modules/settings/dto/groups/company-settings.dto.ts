import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CompanySettingsDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @ApiProperty({ maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ maxLength: 30, example: '+1 (713) 555-0100' })
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+()\-.\s]{5,30}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address!: LocalizedTextDto;

  @ApiProperty({ maxLength: 300 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(300)
  website!: string;
}
