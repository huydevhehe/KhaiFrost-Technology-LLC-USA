import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntry } from '../audit-log/entities/audit-log-entry.entity';
import { DashboardAdminController } from './controllers/dashboard-admin.controller';
import { DashboardCountsRepository } from './repositories/dashboard-counts.repository';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntry])],
  controllers: [DashboardAdminController],
  providers: [DashboardService, DashboardCountsRepository],
})
export class DashboardModule {}
