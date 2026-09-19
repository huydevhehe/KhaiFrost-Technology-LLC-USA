import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IsNormalizablePhone } from '../../../common/validators/is-normalizable-phone.validator';
import { STAFF_ROLES, StaffRole } from './list-users-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateUserDto {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional()
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @IsNormalizablePhone()
  phone?: string;

  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'MediaAsset id, null removes' })
  @IsOptional()
  @IsUUID()
  avatarId?: string | null;
}
