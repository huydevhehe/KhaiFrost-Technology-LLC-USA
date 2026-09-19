import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const AUDIT_LOG_SORT_FIELDS = ['occurredAt', 'action', 'actorName', 'entityName'];

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AuditLogFilterFieldsDto {
  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive lower bound' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive upper bound' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ example: 'post.updated' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ example: 'Post' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  entityName?: string;
}

export class ExportAuditLogsQueryDto extends AuditLogFilterFieldsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class ListAuditLogsQueryDto extends IntersectionType(
  PaginationQueryDto,
  AuditLogFilterFieldsDto,
) {}
