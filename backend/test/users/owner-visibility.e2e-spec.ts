import { Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AdminController } from '../../src/common/decorators/admin-controller.decorator';
import { Role } from '../../src/common/enums/role.enum';
import { AuditLogEntry } from '../../src/modules/audit-log/entities/audit-log-entry.entity';
import { AuditLogModule } from '../../src/modules/audit-log/audit-log.module';
import { AuditLogService } from '../../src/modules/audit-log/services/audit-log.service';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import { SearchModule } from '../../src/modules/search/search.module';
import { User } from '../../src/modules/users/entities/user.entity';
import { UsersModule } from '../../src/modules/users/users.module';
import {
  as as asActor,
  OPERATIONS_ENTITIES,
  seedUser,
} from '../dashboard/support/operations-fixtures';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';

let ownerReference = '';

@AdminController('owner-probe')
class OwnerProbeController {
  @Get()
  read() {
    return {
      createdById: ownerReference,
      updatedById: 'someone-else',
      nested: [{ authorId: ownerReference }],
    };
  }
}

@Controller()
class NoopController {}

// Owners must be invisible to admins and staff everywhere, but fully visible to owners
describe('owner invisibility', () => {
  let context: ModuleTestingContext;
  let users: Repository<User>;
  let owner: User;
  let otherOwner: User;
  let admin: User;
  let staff: User;
  const marker = 'Zzowner';
  const server = () => context.app.getHttpServer();
  const as = (user: User) => asActor({ id: user.id, role: user.role });

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: OPERATIONS_ENTITIES,
      imports: [UsersModule, AuditLogModule, DashboardModule, SearchModule],
      controllers: [OwnerProbeController, NoopController],
    });
    users = context.dataSource.getRepository(User);
    owner = await seedUser(context.dataSource, { role: Role.OWNER, fullName: `${marker} Chu Mot` });
    otherOwner = await seedUser(context.dataSource, {
      role: Role.OWNER,
      fullName: `${marker} Chu Hai`,
    });
    admin = await seedUser(context.dataSource, {
      role: Role.ADMIN,
      fullName: `${marker} Quan Tri`,
    });
    staff = await seedUser(context.dataSource, {
      role: Role.STAFF,
      fullName: `${marker} Nhan Vien`,
    });
    ownerReference = owner.id;

    const audit = context.moduleRef.get(AuditLogService);
    await audit.record({
      action: 'thing.created',
      entityName: 'Thing',
      entityId: 't1',
      actorId: owner.id,
    });
    await audit.record({
      action: 'thing.created',
      entityName: 'Thing',
      entityId: 't2',
      actorId: admin.id,
    });
    await audit.record({
      action: 'user.updated',
      entityName: 'User',
      entityId: owner.id,
      actorId: otherOwner.id,
    });
    await audit.record({
      action: 'user.updated',
      entityName: 'User',
      entityId: staff.id,
      actorId: admin.id,
    });
  });

  afterAll(async () => {
    await context.close();
  });

  describe('users API', () => {
    it('hides owners from admin lists, filters and totals but shows them to owners', async () => {
      const adminList = await request(server())
        .get(`/api/v1/admin/users?pageSize=100&search=${marker}`)
        .set(as(admin))
        .expect(200);
      expect(adminList.body.data.map((item: { role: string }) => item.role).sort()).toEqual([
        'admin',
        'staff',
      ]);
      expect(adminList.body.meta.total).toBe(2);
      expect(JSON.stringify(adminList.body)).not.toContain(owner.email);

      const ownerFilter = await request(server())
        .get('/api/v1/admin/users?role=owner')
        .set(as(admin))
        .expect(200);
      expect(ownerFilter.body.data).toHaveLength(0);
      expect(ownerFilter.body.meta.total).toBe(0);

      const ownerList = await request(server())
        .get(`/api/v1/admin/users?pageSize=100&search=${marker}`)
        .set(as(owner))
        .expect(200);
      expect(ownerList.body.data).toHaveLength(4);
      expect(ownerList.body.meta.total).toBe(4);
      const onlyOwners = await request(server())
        .get('/api/v1/admin/users?role=owner')
        .set(as(owner))
        .expect(200);
      expect(onlyOwners.body.meta.total).toBe(2);
    });

    it('answers 404 to an admin for any read or action on an owner, and 403 to an owner', async () => {
      const id = otherOwner.id;
      const base = `/api/v1/admin/users/${id}`;
      const adminCalls: [string, string, object?][] = [
        ['get', base],
        ['patch', base, { version: 1, fullName: 'x' }],
        ['post', `${base}/lock`],
        ['post', `${base}/unlock`],
        ['post', `${base}/reset-password`],
        ['delete', base],
      ];
      for (const [method, url, body] of adminCalls) {
        const response = await request(server())[method as 'get'](url).set(as(admin)).send(body);
        expect([response.status, response.body.error?.code]).toEqual([404, 'NOT_FOUND']);
      }
      await request(server()).get(`/api/v1/admin/users/${id}`).set(as(owner)).expect(200);
      await request(server()).post(`/api/v1/admin/users/${id}/lock`).set(as(owner)).expect(403);
      expect((await users.findOneByOrFail({ id })).status).toBe('active');
    });
  });

  describe('search', () => {
    it('does not return owner users to admins but does to owners', async () => {
      const query = `q=${marker}&types=users`;
      const forAdmin = await request(server())
        .get(`/api/v1/admin/search?${query}`)
        .set(as(admin))
        .expect(200);
      expect(forAdmin.body.data.map((hit: { id: string }) => hit.id).sort()).toEqual(
        [admin.id, staff.id].sort(),
      );
      const forOwner = await request(server())
        .get(`/api/v1/admin/search?${query}`)
        .set(as(owner))
        .expect(200);
      expect(forOwner.body.data).toHaveLength(4);
    });
  });

  describe('dashboard', () => {
    it('excludes owners from the staff account counts of non owners', async () => {
      const forAdmin = await request(server())
        .get('/api/v1/admin/dashboard/summary')
        .set(as(admin))
        .expect(200);
      const forOwner = await request(server())
        .get('/api/v1/admin/dashboard/summary')
        .set(as(owner))
        .expect(200);
      expect(forOwner.body.data.staffUsers.total).toBe(forAdmin.body.data.staffUsers.total + 2);
    });

    it('masks owner actors and drops owner targets in the recent activity feed', async () => {
      const feed = await request(server())
        .get('/api/v1/admin/dashboard/recent-activity')
        .set(as(admin))
        .expect(200);
      const text = JSON.stringify(feed.body);
      expect(text).not.toContain(owner.fullName);
      expect(text).not.toContain(otherOwner.fullName);
      expect(text).not.toContain(owner.id);
      expect(text).toContain('Quản trị viên.');
    });
  });

  describe('audit log', () => {
    let entries: Repository<AuditLogEntry>;
    const list = (actor: User, query = '') =>
      request(server()).get(`/api/v1/admin/audit-logs?pageSize=100${query}`).set(as(actor));

    beforeAll(() => {
      entries = context.dataSource.getRepository(AuditLogEntry);
    });

    it('shows owners their own trail unmasked', async () => {
      const response = await list(owner).expect(200);
      const entry = response.body.data.find((item: { entityId: string }) => item.entityId === 't1');
      expect(entry).toMatchObject({
        actorId: owner.id,
        actorName: owner.fullName,
        actorRole: 'owner',
      });
      expect(response.body.meta.total).toBe(await entries.count());
    });

    it('masks an owner actor for admins and hides entries about owner accounts', async () => {
      const response = await list(admin).expect(200);
      const text = JSON.stringify(response.body);
      expect(text).not.toContain(owner.id);
      expect(text).not.toContain(otherOwner.id);
      expect(text).not.toContain(owner.fullName);
      expect(text).not.toContain(owner.email);
      const masked = response.body.data.find(
        (item: { entityId: string }) => item.entityId === 't1',
      );
      expect(masked).toMatchObject({
        actorId: null,
        actorName: 'Quản trị viên.',
        actorRole: null,
        ipAddress: null,
        metadata: {},
      });
      // The user.updated entry that targets an owner is dropped, the one about staff stays
      const userEntries = response.body.data.filter(
        (item: { action: string }) => item.action === 'user.updated',
      );
      expect(userEntries.map((item: { entityId: string }) => item.entityId)).toEqual([staff.id]);
      expect(response.body.meta.total).toBe((await entries.count()) - 1);
    });

    it('returns nothing when an admin filters or searches by an owner', async () => {
      const byId = await list(admin, `&actorId=${owner.id}`).expect(200);
      expect(byId.body.data).toHaveLength(0);
      expect(byId.body.meta.total).toBe(0);
      const byName = await list(admin, `&search=${encodeURIComponent(owner.fullName)}`).expect(200);
      expect(byName.body.data).toHaveLength(0);
      const byOwnerId = await list(owner, `&actorId=${owner.id}`).expect(200);
      expect(byOwnerId.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('embedded user references', () => {
    it('nulls ids that point at owners for admins and keeps them for owners', async () => {
      const forAdmin = await request(server())
        .get('/api/v1/admin/owner-probe')
        .set(as(admin))
        .expect(200);
      expect(forAdmin.body.data).toEqual({
        createdById: null,
        updatedById: 'someone-else',
        nested: [{ authorId: null }],
      });
      const forOwner = await request(server())
        .get('/api/v1/admin/owner-probe')
        .set(as(owner))
        .expect(200);
      expect(forOwner.body.data.createdById).toBe(owner.id);
      expect(forOwner.body.data.nested[0].authorId).toBe(owner.id);
    });
  });
});
