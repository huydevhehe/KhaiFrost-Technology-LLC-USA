import request from 'supertest';
import { Repository } from 'typeorm';
import { Role } from '../../src/common/enums/role.enum';
import { AuditLogEntry } from '../../src/modules/audit-log/entities/audit-log-entry.entity';
import { AuthIdentity } from '../../src/modules/auth/entities/auth-identity.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/enums/user-status.enum';
import { UsersService } from '../../src/modules/users/services/users.service';
import { cookieHeader, cookiesFrom } from '../auth/support/cookies';
import {
  createIdentityTestingContext,
  IdentityTestingContext,
} from '../auth/support/create-identity-testing-context';

const PASSWORD = 'Str0ng-Passphrase-1';
let counter = 0;

describe('customers (real access control guard)', () => {
  let context: IdentityTestingContext;
  let users: Repository<User>;
  const server = () => context.app.getHttpServer();

  beforeAll(async () => {
    context = await createIdentityTestingContext();
    users = context.dataSource.getRepository(User);
  });

  afterAll(async () => {
    await context.close();
  });

  const details = () => {
    counter++;
    return {
      fullName: `Customer ${counter}`,
      email: `customer${counter}@example.com`,
      phone: `09${String(30000000 + counter * 17).slice(0, 8)}`,
      password: PASSWORD,
    };
  };

  async function registerCustomer() {
    const identity = details();
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send(identity)
      .expect(201);
    return { identity, id: response.body.data.user.id as string, jar: cookiesFrom(response) };
  }

  async function staffJar(role: Role) {
    const identity = details();
    await context.app.get(UsersService).create({ ...identity, role });
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ identifier: identity.email, password: PASSWORD })
      .expect(200);
    const jar = cookiesFrom(login);
    const elevated = await request(server())
      .post('/api/v1/auth/admin-session')
      .set('Cookie', cookieHeader(jar))
      .send({ password: PASSWORD })
      .expect(200);
    return { ...jar, ...cookiesFrom(elevated) };
  }

  const cookie = (jar: Record<string, string>) => cookieHeader(jar);

  describe('admin API', () => {
    it('is closed to anonymous, customer and staff callers', async () => {
      const customer = await registerCustomer();
      const staff = await staffJar(Role.STAFF);
      await request(server()).get('/api/v1/admin/customers').expect(401);
      await request(server())
        .get('/api/v1/admin/customers')
        .set('Cookie', cookie(customer.jar))
        .expect(403);
      await request(server())
        .get('/api/v1/admin/customers')
        .set('Cookie', cookie(staff))
        .expect(403);
    });

    it('lists only customers with search, status filter and pagination', async () => {
      const admin = await staffJar(Role.ADMIN);
      const marker = `cust${Date.now().toString(36)}`;
      const created: string[] = [];
      for (const name of ['A', 'B', 'C']) {
        const identity = details();
        const response = await request(server())
          .post('/api/v1/auth/register')
          .send({ ...identity, fullName: `${name} ${marker}` });
        created.push(response.body.data.user.id);
      }
      await users.update({ id: created[0] }, { status: UserStatus.LOCKED });

      const all = await request(server())
        .get(`/api/v1/admin/customers?search=${marker}`)
        .set('Cookie', cookie(admin))
        .expect(200);
      expect(all.body.data).toHaveLength(3);
      expect(all.body.data.every((item: { role?: string }) => item.role === undefined)).toBe(true);
      expect(JSON.stringify(all.body)).not.toMatch(/passwordHash/);
      const locked = await request(server())
        .get(`/api/v1/admin/customers?search=${marker}&status=locked`)
        .set('Cookie', cookie(admin));
      expect(locked.body.data).toHaveLength(1);
      const paged = await request(server())
        .get(
          `/api/v1/admin/customers?search=${marker}&pageSize=2&page=2&sortBy=fullName&sortOrder=asc`,
        )
        .set('Cookie', cookie(admin));
      expect(paged.body.data).toHaveLength(1);
      expect(paged.body.meta).toMatchObject({ total: 3, totalPages: 2 });

      const staffOnly = await request(server())
        .get('/api/v1/admin/customers?search=@khaifrost')
        .set('Cookie', cookie(admin));
      expect(staffOnly.body.data).toHaveLength(0);
    });

    it('shows one customer but never a back office account', async () => {
      const admin = await staffJar(Role.ADMIN);
      const customer = await registerCustomer();
      const found = await request(server())
        .get(`/api/v1/admin/customers/${customer.id}`)
        .set('Cookie', cookie(admin))
        .expect(200);
      expect(found.body.data).toMatchObject({ id: customer.id, status: 'active' });
      const staffRow = await users.findOneByOrFail({ role: Role.ADMIN });
      await request(server())
        .get(`/api/v1/admin/customers/${staffRow.id}`)
        .set('Cookie', cookie(admin))
        .expect(404);
      await request(server())
        .post(`/api/v1/admin/customers/${staffRow.id}/lock`)
        .set('Cookie', cookie(admin))
        .expect(404);
      await request(server())
        .delete(`/api/v1/admin/customers/${staffRow.id}`)
        .set('Cookie', cookie(admin))
        .expect(404);
    });

    it('locks (sessions die at once), unlocks and soft deletes a customer, with audit entries', async () => {
      const admin = await staffJar(Role.ADMIN);
      const customer = await registerCustomer();
      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie(customer.jar))
        .expect(200);

      const locked = await request(server())
        .post(`/api/v1/admin/customers/${customer.id}/lock`)
        .set('Cookie', cookie(admin))
        .expect(200);
      expect(locked.body.data.status).toBe('locked');
      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie(customer.jar))
        .expect(401);
      const stillLocked = await request(server())
        .post('/api/v1/auth/login')
        .send({ identifier: customer.identity.email, password: PASSWORD });
      expect(stillLocked.status).toBe(403);

      await request(server())
        .post(`/api/v1/admin/customers/${customer.id}/unlock`)
        .set('Cookie', cookie(admin))
        .expect(200);
      await request(server())
        .post('/api/v1/auth/login')
        .send({ identifier: customer.identity.email, password: PASSWORD })
        .expect(200);

      await request(server())
        .delete(`/api/v1/admin/customers/${customer.id}`)
        .set('Cookie', cookie(admin))
        .expect(204);
      await request(server())
        .get(`/api/v1/admin/customers/${customer.id}`)
        .set('Cookie', cookie(admin))
        .expect(404);
      await request(server())
        .post('/api/v1/auth/login')
        .send({ identifier: customer.identity.email, password: PASSWORD })
        .expect(401);

      const entries = await context.dataSource
        .getRepository(AuditLogEntry)
        .find({ where: { entityId: customer.id } });
      const actions = entries.map((entry) => entry.action);
      expect(actions).toEqual(
        expect.arrayContaining(['customer.locked', 'customer.unlocked', 'customer.deleted']),
      );
      expect(entries.find((entry) => entry.action === 'customer.locked')).toMatchObject({
        actorRole: 'admin',
        entityName: 'User',
        statusCode: 200,
      });
    });
  });

  describe('profile', () => {
    it('requires authentication', async () => {
      await request(server()).get('/api/v1/me/profile').expect(401);
      await request(server()).patch('/api/v1/me/profile').send({ fullName: 'x' }).expect(401);
    });

    it('returns and updates the profile', async () => {
      const customer = await registerCustomer();
      const profile = await request(server())
        .get('/api/v1/me/profile')
        .set('Cookie', cookie(customer.jar))
        .expect(200);
      expect(profile.body.data).toMatchObject({
        fullName: customer.identity.fullName,
        email: customer.identity.email,
      });

      const updated = await request(server())
        .patch('/api/v1/me/profile')
        .set('Cookie', cookie(customer.jar))
        .send({ fullName: 'New Name', phone: '0971 234 567', preferredLocale: 'en' })
        .expect(200);
      expect(updated.body.data).toMatchObject({
        fullName: 'New Name',
        phone: '+84971234567',
        preferredLocale: 'en',
      });
    });

    it('does not accept email or role changes and validates input', async () => {
      const customer = await registerCustomer();
      const send = (body: object) =>
        request(server())
          .patch('/api/v1/me/profile')
          .set('Cookie', cookie(customer.jar))
          .send(body);
      expect((await send({ email: 'new@example.com' })).status).toBe(400);
      expect((await send({ role: 'owner' })).status).toBe(400);
      expect((await send({ phone: 'abc' })).status).toBe(400);
      expect((await send({ preferredLocale: 'fr' })).status).toBe(400);
      expect((await send({ avatarId: 'x' })).status).toBe(400);
      expect((await send({ avatarId: '00000000-0000-4000-8000-0000000000aa' })).status).toBe(400);
    });

    it('refuses a phone number that belongs to someone else', async () => {
      const first = await registerCustomer();
      const second = await registerCustomer();
      const response = await request(server())
        .patch('/api/v1/me/profile')
        .set('Cookie', cookie(second.jar))
        .send({ phone: first.identity.phone });
      expect(response.status).toBe(409);
      expect(response.body.error.details[0].field).toBe('phone');
    });
  });

  describe('delete account', () => {
    it('requires the current password', async () => {
      const customer = await registerCustomer();
      const wrong = await request(server())
        .delete('/api/v1/me/account')
        .set('Cookie', cookie(customer.jar))
        .send({ currentPassword: 'Wrong-Passphrase-9' });
      expect(wrong.status).toBe(403);
      expect(wrong.body.error.code).toBe('INVALID_PASSWORD');
      await request(server())
        .delete('/api/v1/me/account')
        .set('Cookie', cookie(customer.jar))
        .send({})
        .expect(400);
      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie(customer.jar))
        .expect(200);
    });

    it('anonymises, soft deletes, revokes sessions, purges credentials and audits', async () => {
      const customer = await registerCustomer();
      const other = cookiesFrom(
        await request(server())
          .post('/api/v1/auth/login')
          .send({ identifier: customer.identity.email, password: PASSWORD }),
      );
      await request(server())
        .delete('/api/v1/me/account')
        .set('Cookie', cookie(customer.jar))
        .send({ currentPassword: PASSWORD })
        .expect(204);

      const row = await users
        .createQueryBuilder('u')
        .withDeleted()
        .addSelect('u.passwordHash')
        .where('u.id = :id', { id: customer.id })
        .getOneOrFail();
      expect(row.deletedAt).not.toBeNull();
      expect(row.fullName).toBe('Deleted user');
      expect(row.email).not.toContain(customer.identity.email);
      expect(row.phone).not.toBe(customer.identity.phone);
      expect(row.passwordHash).toBe('!');

      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie(customer.jar))
        .expect(401);
      await request(server()).get('/api/v1/auth/me').set('Cookie', cookie(other)).expect(401);
      expect(
        await context.dataSource.getRepository(AuthIdentity).countBy({ userId: customer.id }),
      ).toBe(0);
      const active = await context.dataSource.query(
        `SELECT count(*)::int AS total FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
        [customer.id],
      );
      expect(active[0].total).toBe(0);

      await request(server())
        .post('/api/v1/auth/login')
        .send({ identifier: customer.identity.email, password: PASSWORD })
        .expect(401);
      const audit = await context.dataSource
        .getRepository(AuditLogEntry)
        .findOneBy({ action: 'customer.account-deleted', entityId: customer.id });
      expect(audit).not.toBeNull();
      // The freed identifiers can be registered again
      await request(server()).post('/api/v1/auth/register').send(customer.identity).expect(201);
    });

    it('is not available to back office accounts', async () => {
      const owner = await staffJar(Role.OWNER);
      await request(server())
        .delete('/api/v1/me/account')
        .set('Cookie', cookie(owner))
        .send({ currentPassword: PASSWORD })
        .expect(403);
    });
  });
});
