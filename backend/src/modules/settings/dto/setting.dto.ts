import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ minimum: 0, description: 'Version last read; 0 when the group was never saved' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @ApiProperty({
    type: Object,
    description: 'Complete value of the group; validated against the group schema',
  })
  @IsObject()
  value!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Expose the group on the public settings endpoint' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class SettingResponseDto {
  @ApiProperty() group!: string;
  @ApiProperty({ type: Object }) value!: Record<string, unknown>;
  @ApiProperty() isPublic!: boolean;
  @ApiProperty({ description: 'True while the group still has its built-in default' })
  isDefault!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ nullable: true, type: Date }) updatedAt!: Date | null;
  @ApiProperty({ type: Object, description: 'MediaAsset id -> public url, for previews' })
  mediaUrls!: Record<string, string>;
}
