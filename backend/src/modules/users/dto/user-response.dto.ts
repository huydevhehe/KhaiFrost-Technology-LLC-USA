import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../enums/user-status.enum';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiProperty({ enum: Locale }) preferredLocale!: Locale;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty() version!: number;
}

export class UserWithTemporaryPasswordDto extends UserResponseDto {
  @ApiPropertyOptional({
    description: 'Shown exactly once; the user must change it at first login',
  })
  temporaryPassword?: string;
}
