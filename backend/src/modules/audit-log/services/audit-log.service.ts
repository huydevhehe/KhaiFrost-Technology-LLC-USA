import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Readable } from 'node:stream';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { RequestContextService } from '../../../common/context/request-context.service';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Role } from '../../../common/enums/role.enum';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { User } from '../../users/entities/user.entity';
import {
  AUDIT_LOG_SORT_FIELDS,
  AuditLogFilterFieldsDto,
  ExportAuditLogsQueryDto,
  ListAuditLogsQueryDto,
} from '../dto/audit-log-query.dto';
import { AuditLogEntryResponseDto } from '../dto/audit-log-response.dto';
import { AuditLogEntry } from '../entities/audit-log-entry.entity';
import { toCsvLine } from '../utils/csv';
import { sanitizeMetadata } from '../utils/sanitize-metadata';

export interface AuditRecordInput {
  action: string;
  entityName?: string | null;
  entityId?: string | null;
  // undefined = take the authenticated user from the request context, null = explicitly anonymous
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: Role | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, unknown>;
}

const EXPORT_BATCH_SIZE = 1000;
const EXPORT_MAX_ROWS = 100_000;
const EXPORT_HEADER = [
  'occurredAt',
  'actorId',
  'actorName',
  'actorRole',
  'action',
  'entityName',
  'entityId',
  'ipAddress',
  'requestId',
  'statusCode',
  'userAgent',
  'metadata',
];

function clip(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) return null;
  return value.length > max ? value.slice(0, max) : value;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntry) private readonly entries: Repository<AuditLogEntry>,
    private readonly dataSource: DataSource,
    private readonly requestContext: RequestContextService,
  ) {}

  // Auditing must never break the business operation it describes
  async record(input: AuditRecordInput): Promise<void> {
    try {
      const actorId =
        input.actorId === undefined ? (this.requestContext.userId ?? null) : input.actorId;
      let actorName = input.actorName ?? null;
      let actorRole = input.actorRole ?? null;
      if (actorId && (actorName === null || actorRole === null)) {
        const actor = await this.lookupActor(actorId);
        actorName ??= actor?.fullName ?? null;
        actorRole ??= actor?.role ?? null;
      }

      await this.entries.save(
        this.entries.create({
          actorId,
          actorName: clip(actorName, 150),
          actorRole,
          action: clip(input.action, 100) as string,
          entityName: clip(input.entityName, 100),
          entityId: clip(input.entityId, 100),
          ipAddress: clip(input.ipAddress ?? this.requestContext.ipAddress, 64),
          userAgent: clip(input.userAgent ?? this.requestContext.userAgent, 400),
          requestId: clip(input.requestId ?? this.requestContext.requestId, 128),
          statusCode: input.statusCode ?? null,
          metadata: sanitizeMetadata(input.metadata ?? {}),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry "${input.action}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async list(
    query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogEntryResponseDto>> {
    const builder = this.applyFilters(
      this.entries.createQueryBuilder('entry'),
      query,
      query.search,
    );
    const sort = resolveSort(query, AUDIT_LOG_SORT_FIELDS, 'occurredAt');
    builder.orderBy(`entry.${sort.field}`, sort.order).addOrderBy('entry.id', 'DESC');
    return paginate(builder, query, (entry) => this.toResponse(entry));
  }

  // Streams in batches so a large export never sits in memory; the upper bound freezes the result set
  exportCsv(query: ExportAuditLogsQueryDto): Readable {
    return Readable.from(this.generateCsv(query, new Date()));
  }

  private async *generateCsv(
    query: ExportAuditLogsQueryDto,
    startedAt: Date,
  ): AsyncGenerator<string> {
    yield '\uFEFF' + toCsvLine(EXPORT_HEADER);
    for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += EXPORT_BATCH_SIZE) {
      const rows = await this.applyFilters(
        this.entries.createQueryBuilder('entry'),
        query,
        query.search,
      )
        .andWhere('entry.occurredAt <= :startedAt', { startedAt })
        .orderBy('entry.occurredAt', 'DESC')
        .addOrderBy('entry.id', 'DESC')
        .offset(offset)
        .limit(EXPORT_BATCH_SIZE)
        .getMany();
      if (rows.length === 0) return;
      yield rows
        .map((row) =>
          toCsvLine([
            row.occurredAt,
            row.actorId,
            row.actorName,
            row.actorRole,
            row.action,
            row.entityName,
            row.entityId,
            row.ipAddress,
            row.requestId,
            row.statusCode,
            row.userAgent,
            row.metadata,
          ]),
        )
        .join('');
      if (rows.length < EXPORT_BATCH_SIZE) return;
    }
  }

  private applyFilters(
    builder: SelectQueryBuilder<AuditLogEntry>,
    filters: AuditLogFilterFieldsDto,
    search?: string,
  ): SelectQueryBuilder<AuditLogEntry> {
    if (filters.from) builder.andWhere('entry.occurredAt >= :from', { from: filters.from });
    if (filters.to) builder.andWhere('entry.occurredAt <= :to', { to: filters.to });
    if (filters.actorId) builder.andWhere('entry.actorId = :actorId', { actorId: filters.actorId });
    if (filters.action) builder.andWhere('entry.action = :action', { action: filters.action });
    if (filters.entityName) {
      builder.andWhere('entry.entityName = :entityName', { entityName: filters.entityName });
    }
    if (search) {
      builder.andWhere(
        `(entry.action ILIKE :pattern OR entry.actorName ILIKE :pattern
          OR entry.entityName ILIKE :pattern OR entry.entityId ILIKE :pattern
          OR entry.ipAddress ILIKE :pattern)`,
        { pattern: containsPattern(search) },
      );
    }
    return builder;
  }

  private toResponse(entry: AuditLogEntry): AuditLogEntryResponseDto {
    return {
      id: entry.id,
      occurredAt: entry.occurredAt.toISOString(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestId: entry.requestId,
      statusCode: entry.statusCode,
      metadata: entry.metadata,
    };
  }

  private async lookupActor(actorId: string): Promise<Pick<User, 'fullName' | 'role'> | null> {
    if (!this.dataSource.hasMetadata(User)) return null;
    return this.dataSource.getRepository(User).findOne({
      select: { id: true, fullName: true, role: true },
      where: { id: actorId },
      withDeleted: true,
    });
  }
}
