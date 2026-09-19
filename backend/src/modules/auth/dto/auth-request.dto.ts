import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Locale } from '../../../common/enums/locale.enum';
import { IsNormalizablePhone } from '../../../common/validators/is-normalizable-phone.validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ maxLength: 32, example: '0912345678' })
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @IsNormalizablePhone()
  phone!: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ enum: Locale, description: 'Language of emails sent to the user' })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}

export class LoginDto {
  @ApiProperty({ maxLength: 254, description: 'Email address or phone number' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty({ maxLength: 254 })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  identifier!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ maxLength: 254 })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  identifier!: string;

  @ApiProperty({ example: '123456' })
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}

export class StartAdminSessionDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}
