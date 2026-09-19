import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AdminController } from '../../src/common/decorators/admin-controller.decorator';
import { AuditAction } from '../../src/common/decorators/audit-action.decorator';
import { Public } from '../../src/common/decorators/public.decorator';
import { Role } from '../../src/common/enums/role.enum';
import { AUDIT_LOG_APPEND_ONLY_DDL } from '../../src/modules/audit-log/database/append-only.sql';
import { AuditLogEntry } from '../../src/modules/audit-log/entities/audit-log-entry.entity';
import { AuditLogModule } from '../../src/modules/audit-log/audit-log.module';
import { AuditLogService } from '../../src/modules/audit-log/services/audit-log.service';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const ACTOR_ID = '00000000-0000-4000-8000-0000000000a1';

@AdminController('widgets')
class WidgetsController {
  @Post()
  @AuditAction('widget.created', 'Widget')
  create() {
    return { id: 'widget-77', name: 'w' };
  }

  @Post(':id/rename')
  @HttpCode(200)
  @AuditAction('widget.renamed', 'Widget')
  rename(@Param('id') id: string) {
    return { ok: id };
  }

  @Delete(':id')
  @HttpCode(204)
  @AuditAction('widget.deleted', 'Widget')
  remove() {}

  @Get('boom')
  @AuditAction('widget.exploded', 'Widget')
  boom(): never {
    throw new Error('boom');
  }
}

@Controller('open-things')
@Public()
class OpenController {
  @Get()
  @AuditAction('open.read', 'Open')
  read() {
    return { data: { id: 'x' } };
  }
}

describe('audit log', () => {
  let context: ModuleTestingContext;
  let entries: Repository<AuditLogEntry>;
  let service: AuditLogService;
  const server = () => context.app.getHttpServer();
  const owner = () => asTestUser({ id: ACTOR_ID, role: Role.OWNER });

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, User, AuditLogEntry],
      imports: [AuditLogModule],
      controllers: [WidgetsController, OpenController],
    });
    entries = context.dataSource.getRepository(AuditLogEntry);
    service = context.moduleRef.get(AuditLogService);
    await context.dataSource.getRepository(User).save(
      context.dataSource.getRepository(User).create({
        id: ACTOR_ID,
        fullName: 'Audit Actor',
        email: 'actor@example.com',
        phone: '+84900000001',
        passwordHash: 'x',
        role: Role.OWNER,
      }),
    );
  });

  afterAll(async () => {
    await context.close();
  });

  describe('interceptor', () => {
    it('records handlers carrying @AuditAction after success with actor snapshot and response id', async () => {
      const response = await request(server())
        .post('/api/v1/admin/widgets')
        .set(owner())
        .set('x-request-id', 'req-audit-0001')
        .expect(201);
      expect(response.body.data.id).toBe('widget-77');
      const entry = await entries.findOneByOrFail({ action: 'widget.created' });
      expect(entry).toMatchObject({
        actorId: ACTOR_ID,
        actorName: 'Audit Actor',
        actorRole: 'owner',
        entityName: 'Widget',
        entityId: 'widget-77',
        statusCode: 201,
        requestId: 'req-audit-0001',
      });
      expect(entry.metadata).toMatchObject({ method: 'POST', route: '/api/v1/admin/widgets' });
      expect(entry.occurredAt).toBeInstanceOf(Date);
    });

    it('falls back to the route id and to the status code of the response', async () => {
      await request(server()).post('/api/v1/admin/widgets/abc-123/rename').set(owner()).expect(200);
      await request(server()).delete('/api/v1/admin/widgets/gone-1').set(owner()).expect(204);
      expect(await entries.findOneByOrFail({ action: 'widget.renamed' })).toMatchObject({
        entityId: 'abc-123',
        statusCode: 200,
      });
      expect(await entries.findOneByOrFail({ action: 'widget.deleted' })).toMatchObject({
        entityId: 'gone-1',
        statusCode: 204,
      });
    });

    it('does not record failed or rejected requests', async () => {
      await request(server()).get('/api/v1/admin/widgets/boom').set(owner()).expect(500);
      await request(server()).post('/api/v1/admin/widgets').expect(401);
      await request(server())
        .post('/api/v1/admin/widgets')
        .set(asTestUser({ id: ACTOR_ID, role: Role.CUSTOMER }))
        .expect(403);
      expect(await entries.countBy({ action: 'widget.exploded' })).toBe(0);
    });

    it('records anonymous public handlers without an actor', async () => {
      await request(server()).get('/api/v1/open-things').expect(200);
      const entry = await entries.findOneByOrFail({ action: 'open.read' });
      expect(entry.actorId).toBeNull();
    });
  });

  describe('AuditLogService.record', () => {
    it('swallows failures instead of throwing into the caller', async () => {
      const broken = new AuditLogService(
        { save: () => Promise.reject(new Error('db down')), create: () => ({}) } as never,
        context.dataSource,
        {
          userId: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          requestId: undefined,
        } as never,
      );
      await expect(broken.record({ action: 'x.y' })).resolves.toBeUndefined();
    });

    it('strips secrets from metadata and clips oversized values', async () => {
      await service.record({
        action: 'test.secrets',
        actorId: null,
        metadata: { password: 'hunter2', nested: { token: 'abc', fine: 1 } },
      });
      const entry = await entries.findOneByOrFail({ action: 'test.secrets' });
      expect(JSON.stringify(entry.metadata)).not.toMatch(/hunter2|abc/);
      expect(entry.metadata).toMatchObject({ password: '[redacted]', nested: { fine: 1 } });
    });

    it('exposes no way to update or delete entries', () => {
      const methods = Object.getOwnPropertyNames(AuditLogService.prototype);
      expect(methods.filter((name) => /update|delete|remove|purge|clear/i.test(name))).toEqual([]);
    });
  });

  describe('append-only trigger DDL', () => {
    it('blocks UPDATE, DELETE and TRUNCATE once installed, while inserts keep working', async () => {
      await service.record({ action: 'trigger.probe', actorId: null });
      await context.dataSource.query(AUDIT_LOG_APPEND_ONLY_DDL);

      await expect(
        entries.update({ action: 'trigger.probe' }, { action: 'changed' }),
      ).rejects.toThrow(/append-only/);
      await expect(entries.delete({ action: 'trigger.probe' })).rejects.toThrow(/append-only/);
      await expect(context.dataSource.query('TRUNCATE audit_log_entries')).rejects.toThrow(
        /append-only/,
      );
      await service.record({ action: 'trigger.after', actorId: null });
      expect(await entries.countBy({ action: 'trigger.after' })).toBe(1);
      expect(await entries.countBy({ action: 'trigger.probe' })).toBe(1);
    });
  });

  describe('admin endpoints', () => {
    beforeAll(async () => {
      const base = Date.parse('2025-01-10T00:00:00Z');
      for (let index = 0; index < 5; index++) {
        await entries.insert({
          occurredAt: new Date(base + index * 86_400_000),
          actorId: index % 2 === 0 ? ACTOR_ID : null,
          actorName: index % 2 === 0 ? 'Audit Actor' : null,
          action: index < 3 ? 'listing.updated' : 'listing.deleted',
          entityName: 'Listing',
          entityId: `L-${index}`,
          ipAddress: '10.0.0.1',
          metadata: {},
        });
      }
      await entries.insert({
        occurredAt: new Date(base),
        action: 'listing.created',
        entityName: 'Listing',
        entityId: '=cmd|calc',
        actorName: '+SUM(1)',
        metadata: {},
      });
    });

    it('is closed to anonymous, customers and staff; open to admin and owner (list)', async () => {
      await request(server()).get('/api/v1/admin/audit-logs').expect(401);
      await request(server())
        .get('/api/v1/admin/audit-logs')
        .set(asTestUser({ id: ACTOR_ID, role: Role.CUSTOMER }))
        .expect(403);
      await request(server())
        .get('/api/v1/admin/audit-logs')
        .set(asTestUser({ id: ACTOR_ID, role: Role.STAFF }))
        .expect(403);
      await request(server())
        .get('/api/v1/admin/audit-logs')
        .set(asTestUser({ id: ACTOR_ID, role: Role.ADMIN }))
        .expect(200);
      await request(server()).get('/api/v1/admin/audit-logs').set(owner()).expect(200);
    });

    it('filters by action, entity, actor, date range and search, newest first', async () => {
      const get = (query: string) =>
        request(server()).get(`/api/v1/admin/audit-logs?${query}`).set(owner());
      const byAction = await get('action=listing.deleted');
      expect(byAction.body.data.map((item: { entityId: string }) => item.entityId).sort()).toEqual([
        'L-3',
        'L-4',
      ]);
      const byActor = await get('actorId=' + ACTOR_ID + '&entityName=Listing');
      expect(
        byActor.body.data.every((item: { actorId: string }) => item.actorId === ACTOR_ID),
      ).toBe(true);
      const range = await get(
        'entityName=Listing&from=2025-01-11T00:00:00Z&to=2025-01-12T23:59:59Z',
      );
      expect(range.body.data.map((item: { entityId: string }) => item.entityId).sort()).toEqual([
        'L-1',
        'L-2',
      ]);
      const search = await get('search=L-3');
      expect(search.body.data).toHaveLength(1);
      const ordered = await get('entityName=Listing&pageSize=100');
      const times = ordered.body.data.map((item: { occurredAt: string }) =>
        Date.parse(item.occurredAt),
      );
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it('paginates, sorts on an allow-list only and validates input', async () => {
      const get = (query: string) =>
        request(server()).get(`/api/v1/admin/audit-logs?${query}`).set(owner());
      const page = await get('entityName=Listing&pageSize=2&page=2&sortBy=action&sortOrder=asc');
      expect(page.status).toBe(200);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.meta).toMatchObject({ page: 2, pageSize: 2, total: 6, totalPages: 3 });
      expect((await get('sortBy=metadata')).status).toBe(200);
      expect((await get('from=yesterday')).status).toBe(400);
      expect((await get('actorId=nope')).status).toBe(400);
      expect((await get('search=%25')).body.data).toHaveLength(0);
    });

    it('exports CSV for owners only (audit-log:export), streamed and injection safe', async () => {
      await request(server())
        .get('/api/v1/admin/audit-logs/export')
        .set(asTestUser({ id: ACTOR_ID, role: Role.ADMIN }))
        .expect(403);
      await request(server()).get('/api/v1/admin/audit-logs/export').expect(401);

      const response = await request(server())
        .get('/api/v1/admin/audit-logs/export?entityName=Listing')
        .set(owner())
        .buffer(true)
        .parse((res, callback) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => (text += chunk));
          res.on('end', () => callback(null, text));
        })
        .expect(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      const text = response.body as unknown as string;
      const lines = text.replace('﻿', '').trim().split('\r\n');
      expect(lines[0]).toBe(
        'occurredAt,actorId,actorName,actorRole,action,entityName,entityId,ipAddress,requestId,statusCode,userAgent,metadata',
      );
      expect(lines).toHaveLength(7);
      expect(text).toContain("'=cmd|calc");
      expect(text).toContain("'+SUM(1)");
      expect(text).not.toMatch(/(^|,)=cmd/m);
    });

    it('records the export itself', async () => {
      await request(server()).get('/api/v1/admin/audit-logs/export').set(owner()).expect(200);
      expect(await entries.countBy({ action: 'audit-log.exported' })).toBeGreaterThan(0);
    });
  });
});
