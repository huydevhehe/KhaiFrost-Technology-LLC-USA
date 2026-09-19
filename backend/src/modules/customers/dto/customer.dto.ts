import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { IsNormalizablePhone } from '../../../common/validators/is-normalizable-phone.validator';
import { UserStatus } from '../../users/enums/user-status.enum';

export const CUSTOMER_SORT_FIELDS = ['createdAt', 'fullName', 'email', 'status', 'lastLoginAt'];

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class CustomerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiProperty({ enum: Locale }) preferredLocale!: Locale;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty() version!: number;
}

export class CustomerWithTemporaryPasswordDto extends CustomerResponseDto {
  @ApiPropertyOptional({
    description: 'Shown exactly once; the customer must change it at first login',
  })
  temporaryPassword?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ maxLength: 32, description: 'Vietnamese or international (+country code)' })
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @IsNormalizablePhone()
  phone!: string;

  @ApiPropertyOptional({
    minLength: 10,
    maxLength: 128,
    description: 'When omitted a temporary password is generated and returned once',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @IsNormalizablePhone()
  phone?: string;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'MediaAsset id, null removes' })
  @IsOptional()
  @IsUUID()
  avatarId?: string | null;

  @ApiPropertyOptional({ enum: Locale })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}

export class DeleteAccountDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;
}
