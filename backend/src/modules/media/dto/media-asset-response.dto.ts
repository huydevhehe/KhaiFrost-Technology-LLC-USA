import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MediaAssetResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'displayName when set, otherwise the uploaded file name' })
  name!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty({ nullable: true, type: String }) displayName!: string | null;
  @ApiProperty({ enum: ['image', 'pdf'] }) kind!: 'image' | 'pdf';
  @ApiProperty() mimeType!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ description: 'Falls back to url when no thumbnail variant exists' })
  thumbnailUrl!: string;
  @ApiProperty({ nullable: true, type: Number }) width!: number | null;
  @ApiProperty({ nullable: true, type: Number }) height!: number | null;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ nullable: true, type: String }) folder!: string | null;
  @ApiProperty({ nullable: true, type: String }) uploadedById!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class MediaVariantResponseDto {
  @ApiProperty() url!: string;
  @ApiProperty({ nullable: true, type: Number }) width!: number | null;
  @ApiProperty({ nullable: true, type: Number }) height!: number | null;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() mimeType!: string;
}

export class LocalizedTextDto {
  @ApiProperty({ nullable: true, type: String }) vi!: string | null;
  @ApiProperty({ nullable: true, type: String }) en!: string | null;
}

export class MediaUsageResponseDto {
  @ApiProperty() entityName!: string;
  @ApiPropertyOptional() entityId?: string;
  @ApiProperty() field!: string;
}

export class MediaAssetDetailResponseDto extends MediaAssetResponseDto {
  @ApiProperty() version!: number;
  @ApiProperty() checksumSha256!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'object' } })
  variants!: Record<string, MediaVariantResponseDto>;
  @ApiProperty({ type: LocalizedTextDto }) altText!: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) caption!: LocalizedTextDto;
  @ApiProperty({ type: [MediaUsageResponseDto] }) usages!: MediaUsageResponseDto[];
}

export class MediaUploadErrorDto {
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
}

export class MediaUploadResultDto {
  @ApiProperty() originalName!: string;
  @ApiProperty({ enum: ['created', 'duplicate', 'rejected'] })
  status!: 'created' | 'duplicate' | 'rejected';
  @ApiPropertyOptional({ type: MediaAssetResponseDto }) asset?: MediaAssetResponseDto;
  @ApiPropertyOptional({ type: MediaUploadErrorDto }) error?: MediaUploadErrorDto;
}

export class MediaUploadResponseDto {
  @ApiProperty({ type: [MediaUploadResultDto] }) results!: MediaUploadResultDto[];
  @ApiProperty() created!: number;
  @ApiProperty() duplicates!: number;
  @ApiProperty() rejected!: number;
}
