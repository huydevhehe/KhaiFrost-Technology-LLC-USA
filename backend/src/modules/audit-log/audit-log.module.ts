import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsAdminController } from './controllers/audit-logs-admin.controller';
import { AuditLogEntry } from './entities/audit-log-entry.entity';
import { AuditActionInterceptor } from './interceptors/audit-action.interceptor';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntry])],
  controllers: [AuditLogsAdminController],
  providers: [AuditLogService, { provide: APP_INTERCEPTOR, useClass: AuditActionInterceptor }],
  exports: [AuditLogService],
})
export class AuditLogModule {}
