import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';

export class AuthUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiProperty({ enum: Locale }) preferredLocale!: Locale;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiProperty({ type: [String], example: ['post:read'] }) permissions!: string[];
  @ApiProperty() adminSessionActive!: boolean;
}

export class AuthSessionResultDto {
  @ApiProperty({ type: AuthUserResponseDto }) user!: AuthUserResponseDto;
}

export class SessionSummaryDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) userAgent!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) lastUsedAt!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty() rememberMe!: boolean;
  @ApiProperty() current!: boolean;
}

export class AdminSessionStatusDto {
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  expiresAt!: string | null;
}

export class AcceptedResponseDto {
  @ApiProperty({ example: true }) accepted!: boolean;
}
