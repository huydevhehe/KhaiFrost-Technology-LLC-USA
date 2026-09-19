import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Readable } from 'node:stream';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { RequestContextService } from '../../../common/context/request-context.service';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Role } from '../../../common/enums/role.enum';
import { canSeeOwners } from '../../../common/constants/owner-visibility';
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
import { maskOwnerActor, restrictAuditToViewer } from '../utils/audit-owner-visibility';
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
    viewerRole: Role | null | undefined,
    query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogEntryResponseDto>> {
    const builder = await this.restrict(
      this.applyFilters(this.entries.createQueryBuilder('entry'), query, viewerRole, query.search),
      viewerRole,
    );
    const sort = resolveSort(query, AUDIT_LOG_SORT_FIELDS, 'occurredAt');
    builder.orderBy(`entry.${sort.field}`, sort.order).addOrderBy('entry.id', 'DESC');
    return paginate(builder, query, (entry) => this.toResponse(entry, viewerRole));
  }

  // Streams in batches so a large export never sits in memory; the upper bound freezes the result set
  exportCsv(viewerRole: Role | null | undefined, query: ExportAuditLogsQueryDto): Readable {
    return Readable.from(this.generateCsv(viewerRole, query, new Date()));
  }

  private async *generateCsv(
    viewerRole: Role | null | undefined,
    query: ExportAuditLogsQueryDto,
    startedAt: Date,
  ): AsyncGenerator<string> {
    yield '\uFEFF' + toCsvLine(EXPORT_HEADER);
    for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += EXPORT_BATCH_SIZE) {
      const filtered = await this.restrict(
        this.applyFilters(
          this.entries.createQueryBuilder('entry'),
          query,
          viewerRole,
          query.search,
        ),
        viewerRole,
      );
      const rows = await filtered
        .andWhere('entry.occurredAt <= :startedAt', { startedAt })
        .orderBy('entry.occurredAt', 'DESC')
        .addOrderBy('entry.id', 'DESC')
        .offset(offset)
        .limit(EXPORT_BATCH_SIZE)
        .getMany();
      if (rows.length === 0) return;
      yield rows
        .map((row) => {
          const actor = maskOwnerActor(row, viewerRole);
          return toCsvLine([
            row.occurredAt,
            actor.actorId,
            actor.actorName,
            actor.actorRole,
            row.action,
            row.entityName,
            row.entityId,
            row.ipAddress,
            row.requestId,
            row.statusCode,
            row.userAgent,
            row.metadata,
          ]);
        })
        .join('');
      if (rows.length < EXPORT_BATCH_SIZE) return;
    }
  }

  private applyFilters(
    builder: SelectQueryBuilder<AuditLogEntry>,
    filters: AuditLogFilterFieldsDto,
    viewerRole: Role | null | undefined,
    search?: string,
  ): SelectQueryBuilder<AuditLogEntry> {
    if (filters.from) builder.andWhere('entry.occurredAt >= :from', { from: filters.from });
    if (filters.to) builder.andWhere('entry.occurredAt <= :to', { to: filters.to });
    if (filters.actorId) builder.andWhere('entry.actorId = :actorId', { actorId: filters.actorId });
    // Whatever an owner did is not attributable to an id for anyone but owners
    if (filters.actorId && !canSeeOwners(viewerRole)) {
      builder.andWhere("entry.actorRole IS DISTINCT FROM 'owner'");
    }
    if (filters.action) builder.andWhere('entry.action = :action', { action: filters.action });
    if (filters.entityName) {
      builder.andWhere('entry.entityName = :entityName', { entityName: filters.entityName });
    }
    if (search) {
      const actorNameMatch = canSeeOwners(viewerRole)
        ? 'entry.actorName ILIKE :pattern'
        : "(entry.actorRole IS DISTINCT FROM 'owner' AND entry.actorName ILIKE :pattern)";
      builder.andWhere(
        `(entry.action ILIKE :pattern OR ${actorNameMatch}
          OR entry.entityName ILIKE :pattern OR entry.entityId ILIKE :pattern
          OR entry.ipAddress ILIKE :pattern)`,
        { pattern: containsPattern(search) },
      );
    }
    return builder;
  }

  private restrict(
    builder: SelectQueryBuilder<AuditLogEntry>,
    viewerRole: Role | null | undefined,
  ): Promise<SelectQueryBuilder<AuditLogEntry>> {
    return restrictAuditToViewer(builder, this.entries.manager, viewerRole);
  }

  private toResponse(
    entry: AuditLogEntry,
    viewerRole: Role | null | undefined,
  ): AuditLogEntryResponseDto {
    const masked = maskOwnerActor(entry, viewerRole);
    const hidden = masked.actorRole !== entry.actorRole;
    return {
      id: entry.id,
      occurredAt: entry.occurredAt.toISOString(),
      actorId: masked.actorId,
      actorName: masked.actorName,
      actorRole: masked.actorRole,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId,
      ipAddress: hidden ? null : entry.ipAddress,
      userAgent: hidden ? null : entry.userAgent,
      requestId: entry.requestId,
      statusCode: entry.statusCode,
      metadata: hidden ? {} : entry.metadata,
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
