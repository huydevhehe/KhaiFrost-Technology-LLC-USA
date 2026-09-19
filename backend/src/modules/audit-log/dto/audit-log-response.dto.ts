import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) actorId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) actorName!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) actorRole!: string | null;
  @ApiProperty({ example: 'post.updated' }) action!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) entityName!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) entityId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) userAgent!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) requestId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) statusCode!: number | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) metadata!: Record<string, unknown>;
}
