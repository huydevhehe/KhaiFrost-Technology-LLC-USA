import { Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { SkipResponseEnvelope } from '../../../common/decorators/skip-response-envelope.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { ExportAuditLogsQueryDto, ListAuditLogsQueryDto } from '../dto/audit-log-query.dto';
import { AuditLogEntryResponseDto } from '../dto/audit-log-response.dto';
import { AuditLogService } from '../services/audit-log.service';

@AdminController('audit-logs')
export class AuditLogsAdminController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Search the audit trail' })
  list(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogEntryResponseDto>> {
    return this.auditLog.list(query);
  }

  // Declared before any ":id" style route so "export" is never captured as an id
  @Get('export')
  @RequirePermissions(Permission.AUDIT_LOG_EXPORT)
  @AuditAction('audit-log.exported', 'AuditLogEntry')
  @SkipResponseEnvelope()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-log.csv"')
  @Header('Cache-Control', 'no-store')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export the audit trail as CSV (streamed)' })
  export(@Query() query: ExportAuditLogsQueryDto): StreamableFile {
    return new StreamableFile(this.auditLog.exportCsv(query));
  }
}
