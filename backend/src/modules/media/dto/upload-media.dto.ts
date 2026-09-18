import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const MEDIA_FOLDER_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _\-/]*$/u;

export class UploadMediaDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'Logical folder label (metadata only)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  @Matches(MEDIA_FOLDER_PATTERN, { message: 'folder contains invalid characters' })
  folder?: string;
}
