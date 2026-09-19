import request from 'supertest';
import { Repository } from 'typeorm';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/enums/user-status.enum';
import { UserEvent } from '../../src/modules/users/events/user-events';
import { UsersModule } from '../../src/modules/users/users.module';
import { UsersService } from '../../src/modules/users/services/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const PASSWORD = 'Str0ng-Passphrase-1';
let counter = 0;

describe('staff users admin API', () => {
  let context: ModuleTestingContext;
  let users: Repository<User>;
  let usersService: UsersService;
  const revocations: { userId: string; reason: string }[] = [];

  const server = () => context.app.getHttpServer();
  const as = (user: User) => asTestUser({ id: user.id, role: user.role });

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, User],
      imports: [UsersModule],
    });
    users = context.dataSource.getRepository(User);
    usersService = context.moduleRef.get(UsersService);
    context.moduleRef
      .get(EventEmitter2)
      .on(UserEvent.SESSIONS_REVOKE_REQUESTED, (payload: { userId: string; reason: string }) => {
        revocations.push(payload);
      });
  });

  afterAll(async () => {
    await context.close();
  });

  async function makeUser(role: Role, overrides: Partial<{ status: UserStatus }> = {}) {
    counter++;
    const user = await usersService.create({
      fullName: `User ${counter}`,
      email: `user${counter}@example.com`,
      phone: `09${String(10000000 + counter * 13).slice(0, 8)}`,
      password: PASSWORD,
      role,
    });
    if (overrides.status) await users.update({ id: user.id }, { status: overrides.status });
    return users.findOneByOrFail({ id: user.id });
  }

  describe('permission matrix', () => {
    it('rejects anonymous, customer and staff callers, and allows admin and owner', async () => {
      const staff = await makeUser(Role.STAFF);
      const admin = await makeUser(Role.ADMIN);
      const owner = await makeUser(Role.OWNER);
      const customer = await makeUser(Role.CUSTOMER);
      await request(server()).get('/api/v1/admin/users').expect(401);
      await request(server()).get('/api/v1/admin/users').set(as(customer)).expect(403);
      await request(server()).get('/api/v1/admin/users').set(as(staff)).expect(403);
      await request(server()).get('/api/v1/admin/users').set(as(admin)).expect(200);
      await request(server()).get('/api/v1/admin/users').set(as(owner)).expect(200);
      await request(server()).post('/api/v1/admin/users').set(as(staff)).send({}).expect(403);
    });

    it('needs an admin session (elevated) even for the owner', async () => {
      const owner = await makeUser(Role.OWNER);
      const response = await request(server())
        .get('/api/v1/admin/users')
        .set(asTestUser({ id: owner.id, role: Role.OWNER, adminSessionActive: false }));
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ADMIN_SESSION_REQUIRED');
    });
  });

  describe('list', () => {
    it('lists only back office users, without secrets, with pagination meta', async () => {
      const owner = await makeUser(Role.OWNER);
      await makeUser(Role.CUSTOMER);
      const response = await request(server())
        .get('/api/v1/admin/users?pageSize=100')
        .set(as(owner))
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((item: { role: string }) => item.role !== 'customer')).toBe(
        true,
      );
      expect(response.body.meta).toMatchObject({ page: 1, pageSize: 100 });
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|argon2/);
    });

    it('filters by role, status and search (name, email, phone) and paginates and sorts', async () => {
      const owner = await makeUser(Role.OWNER);
      const marker = `zzmarker${Date.now().toString(36)}`;
      const one = await usersService.create({
        fullName: `Alpha ${marker}`,
        email: `${marker}.a@example.com`,
        phone: '0987000111',
        password: PASSWORD,
        role: Role.STAFF,
      });
      await usersService.create({
        fullName: `Beta ${marker}`,
        email: `${marker}.b@example.com`,
        phone: '0987000222',
        password: PASSWORD,
        role: Role.ADMIN,
      });
      await users.update({ id: one.id }, { status: UserStatus.LOCKED });

      const search = await request(server())
        .get(`/api/v1/admin/users?search=${marker}`)
        .set(as(owner))
        .expect(200);
      expect(search.body.data).toHaveLength(2);
      expect(
        (
          await request(server())
            .get(`/api/v1/admin/users?search=${marker}&role=admin`)
            .set(as(owner))
        ).body.data,
      ).toHaveLength(1);
      expect(
        (
          await request(server())
            .get(`/api/v1/admin/users?search=${marker}&status=locked`)
            .set(as(owner))
        ).body.data,
      ).toHaveLength(1);
      expect(
        (await request(server()).get('/api/v1/admin/users?search=0987000222').set(as(owner))).body
          .data,
      ).toHaveLength(1);

      const sorted = await request(server())
        .get(`/api/v1/admin/users?search=${marker}&sortBy=fullName&sortOrder=asc&pageSize=1&page=2`)
        .set(as(owner))
        .expect(200);
      expect(sorted.body.data[0].fullName).toBe(`Beta ${marker}`);
      expect(sorted.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    });

    it('treats LIKE wildcards literally and ignores unknown sort fields', async () => {
      const owner = await makeUser(Role.OWNER);
      const wildcard = await request(server())
        .get('/api/v1/admin/users?search=%25')
        .set(as(owner))
        .expect(200);
      expect(wildcard.body.data).toHaveLength(0);
      await request(server())
        .get('/api/v1/admin/users?sortBy=passwordHash')
        .set(as(owner))
        .expect(200);
      await request(server()).get('/api/v1/admin/users?sortBy=id;drop').set(as(owner)).expect(400);
    });

    it('validates filters', async () => {
      const owner = await makeUser(Role.OWNER);
      await request(server()).get('/api/v1/admin/users?role=customer').set(as(owner)).expect(400);
      await request(server()).get('/api/v1/admin/users?status=bogus').set(as(owner)).expect(400);
      await request(server()).get('/api/v1/admin/users?pageSize=1000').set(as(owner)).expect(400);
    });
  });

  describe('get', () => {
    it('returns a user, 404 for unknown ids and customers, 400 for a bad id', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      const customer = await makeUser(Role.CUSTOMER);
      const found = await request(server())
        .get(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .expect(200);
      expect(found.body.data).toMatchObject({ id: staff.id, role: 'staff', status: 'active' });
      await request(server())
        .get('/api/v1/admin/users/00000000-0000-4000-8000-000000000000')
        .set(as(owner))
        .expect(404);
      await request(server()).get(`/api/v1/admin/users/${customer.id}`).set(as(owner)).expect(404);
      await request(server()).get('/api/v1/admin/users/nope').set(as(owner)).expect(400);
    });
  });

  describe('create', () => {
    const body = () => {
      counter++;
      return {
        fullName: `Created ${counter}`,
        email: `Created${counter}@Example.com`,
        phone: `09${String(20000000 + counter * 11).slice(0, 8)}`,
        role: 'staff',
      };
    };

    const noRole = ({ fullName, email, phone }: ReturnType<typeof body>) => ({
      fullName,
      email,
      phone,
    });

    it('generates a temporary password returned once and forces a change', async () => {
      const owner = await makeUser(Role.OWNER);
      const response = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send(body())
        .expect(201);
      expect(response.body.data.temporaryPassword).toHaveLength(16);
      expect(response.body.data).toMatchObject({
        mustChangePassword: true,
        role: 'staff',
        status: 'active',
      });
      expect(response.body.data.email).toBe(response.body.data.email.toLowerCase());

      const fetched = await request(server())
        .get(`/api/v1/admin/users/${response.body.data.id}`)
        .set(as(owner));
      expect(fetched.body.data.temporaryPassword).toBeUndefined();
      const stored = await users
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .where('u.id = :id', { id: response.body.data.id })
        .getOneOrFail();
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await usersService.verifyPassword(stored, response.body.data.temporaryPassword)).toBe(
        true,
      );
    });

    it('accepts an explicit password without forcing a change and enforces the policy', async () => {
      const owner = await makeUser(Role.OWNER);
      const ok = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), password: PASSWORD })
        .expect(201);
      expect(ok.body.data.mustChangePassword).toBe(false);
      expect(ok.body.data.temporaryPassword).toBeUndefined();
      const weak = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), password: 'Password1234' });
      expect(weak.status).toBe(400);
    });

    it('validates input and reports only the clashing field', async () => {
      const owner = await makeUser(Role.OWNER);
      const existing = await makeUser(Role.STAFF);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), role: 'customer' })
        .expect(400);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), email: 'bad' })
        .expect(400);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), phone: '1' })
        .expect(400);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), extra: 1 })
        .expect(400);
      const clash = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), email: existing.email.toUpperCase() });
      expect(clash.status).toBe(409);
      expect(clash.body.error.details.map((detail: { field: string }) => detail.field)).toEqual([
        'email',
      ]);
    });

    it('lets the owner create admins (default) and staff but never an owner', async () => {
      const owner = await makeUser(Role.OWNER);
      const withoutRole = noRole(body());
      const defaulted = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send(withoutRole)
        .expect(201);
      expect(defaulted.body.data.role).toBe('admin');
      const admin = await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), role: 'admin' })
        .expect(201);
      expect(admin.body.data.role).toBe('admin');
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(owner))
        .send({ ...body(), role: 'owner' })
        .expect(403);
    });

    it('creates staff by default when an admin sends no role', async () => {
      const admin = await makeUser(Role.ADMIN);
      const withoutRole = noRole(body());
      const response = await request(server())
        .post('/api/v1/admin/users')
        .set(as(admin))
        .send(withoutRole)
        .expect(201);
      expect(response.body.data.role).toBe('staff');
    });

    it('rejects creation by staff and customers', async () => {
      const staff = await makeUser(Role.STAFF);
      const customer = await makeUser(Role.CUSTOMER);
      await request(server()).post('/api/v1/admin/users').set(as(staff)).send(body()).expect(403);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(customer))
        .send(body())
        .expect(403);
    });

    it('lets an admin create staff only', async () => {
      const admin = await makeUser(Role.ADMIN);
      await request(server()).post('/api/v1/admin/users').set(as(admin)).send(body()).expect(201);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(admin))
        .send({ ...body(), role: 'admin' })
        .expect(403);
      await request(server())
        .post('/api/v1/admin/users')
        .set(as(admin))
        .send({ ...body(), role: 'owner' })
        .expect(403);
    });
  });

  describe('update', () => {
    it('updates fields, bumps the version and normalises phone and email', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      const response = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({
          version: staff.version,
          fullName: 'Renamed',
          phone: '0966 123 456',
          email: 'RENAMED@example.com',
        })
        .expect(200);
      expect(response.body.data).toMatchObject({
        fullName: 'Renamed',
        phone: '+84966123456',
        email: 'renamed@example.com',
      });
      expect(response.body.data.version).toBeGreaterThan(staff.version);
    });

    it('rejects a stale version with VERSION_CONFLICT', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, fullName: 'One' })
        .expect(200);
      const stale = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, fullName: 'Two' });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
      await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ fullName: 'x' })
        .expect(400);
    });

    it('is not invalidated by login bookkeeping', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      await usersService.recordFailedLogin(staff.id, 10, 15);
      await usersService.recordSuccessfulLogin(staff.id, { touchLastLogin: true });
      await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, fullName: 'Fine' })
        .expect(200);
    });

    it('detects email and phone clashes with other users', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      const other = await makeUser(Role.STAFF);
      const clash = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, phone: other.phone });
      expect(clash.status).toBe(409);
      expect(clash.body.error.details.map((detail: { field: string }) => detail.field)).toEqual([
        'phone',
      ]);
    });

    it('validates avatar ids against the media library', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      const response = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, avatarId: '00000000-0000-4000-8000-0000000000aa' });
      expect(response.status).toBe(400);
      const media = await context.dataSource.getRepository(MediaAsset).save(
        context.dataSource.getRepository(MediaAsset).create({
          originalName: 'a.png',
          storageKey: `avatars/${Date.now()}.png`,
          mimeType: 'image/png',
          sizeBytes: 10,
          width: 1,
          height: 1,
          checksumSha256: 'a'.repeat(64),
          folder: null,
          variants: {},
          uploadedById: null,
        }),
      );
      const ok = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: staff.version, avatarId: media.id })
        .expect(200);
      expect(ok.body.data.avatarId).toBe(media.id);
      expect(ok.body.data.avatarUrl).toContain('avatars/');
      const cleared = await request(server())
        .patch(`/api/v1/admin/users/${staff.id}`)
        .set(as(owner))
        .send({ version: ok.body.data.version, avatarId: null })
        .expect(200);
      expect(cleared.body.data.avatarId).toBeNull();
    });

    describe('role rules', () => {
      it('lets an admin edit staff but not admins or owners, and not assign elevated roles', async () => {
        const admin = await makeUser(Role.ADMIN);
        const staff = await makeUser(Role.STAFF);
        const otherAdmin = await makeUser(Role.ADMIN);
        const owner = await makeUser(Role.OWNER);
        await request(server())
          .patch(`/api/v1/admin/users/${staff.id}`)
          .set(as(admin))
          .send({ version: staff.version, fullName: 'Ok' })
          .expect(200);
        await request(server())
          .patch(`/api/v1/admin/users/${otherAdmin.id}`)
          .set(as(admin))
          .send({ version: otherAdmin.version, fullName: 'No' })
          .expect(403);
        await request(server())
          .patch(`/api/v1/admin/users/${owner.id}`)
          .set(as(admin))
          .send({ version: owner.version, fullName: 'No' })
          .expect(403);
        const fresh = await users.findOneByOrFail({ id: staff.id });
        await request(server())
          .patch(`/api/v1/admin/users/${staff.id}`)
          .set(as(admin))
          .send({ version: fresh.version, role: 'admin' })
          .expect(403);
        await request(server())
          .patch(`/api/v1/admin/users/${staff.id}`)
          .set(as(admin))
          .send({ version: fresh.version, role: 'owner' })
          .expect(403);
      });

      it('lets an owner change roles and revokes the affected sessions', async () => {
        const owner = await makeUser(Role.OWNER);
        const staff = await makeUser(Role.STAFF);
        revocations.length = 0;
        const response = await request(server())
          .patch(`/api/v1/admin/users/${staff.id}`)
          .set(as(owner))
          .send({ version: staff.version, role: 'admin' })
          .expect(200);
        expect(response.body.data.role).toBe('admin');
        expect(revocations).toContainEqual({ userId: staff.id, reason: 'role-changed' });
      });

      it('does not revoke sessions for changes that keep the role', async () => {
        const owner = await makeUser(Role.OWNER);
        const staff = await makeUser(Role.STAFF);
        revocations.length = 0;
        await request(server())
          .patch(`/api/v1/admin/users/${staff.id}`)
          .set(as(owner))
          .send({ version: staff.version, role: 'staff', fullName: 'Same role' })
          .expect(200);
        expect(revocations).toHaveLength(0);
      });

      it('never lets an owner edit, promote to or assign the owner role', async () => {
        const owner = await makeUser(Role.OWNER);
        const otherOwner = await makeUser(Role.OWNER);
        const admin = await makeUser(Role.ADMIN);
        await request(server())
          .patch(`/api/v1/admin/users/${otherOwner.id}`)
          .set(as(owner))
          .send({ version: otherOwner.version, fullName: 'No' })
          .expect(403);
        await request(server())
          .patch(`/api/v1/admin/users/${admin.id}`)
          .set(as(owner))
          .send({ version: admin.version, role: 'owner' })
          .expect(403);
        const changed = await request(server())
          .patch(`/api/v1/admin/users/${admin.id}`)
          .set(as(owner))
          .send({ version: admin.version, role: 'staff' })
          .expect(200);
        expect(changed.body.data.role).toBe('staff');
      });

      it('never lets anyone change their own role', async () => {
        const owner = await makeUser(Role.OWNER);
        await makeUser(Role.OWNER);
        const response = await request(server())
          .patch(`/api/v1/admin/users/${owner.id}`)
          .set(as(owner))
          .send({ version: owner.version, role: 'staff' });
        expect(response.status).toBe(403);
      });

      it('keeps owners untouchable, even for another owner', async () => {
        const owner = await makeUser(Role.OWNER);
        const other = await makeUser(Role.OWNER);
        const response = await request(server())
          .patch(`/api/v1/admin/users/${other.id}`)
          .set(as(owner))
          .send({ version: other.version, role: 'admin' });
        expect(response.status).toBe(403);
      });
    });
  });

  describe('lock and unlock', () => {
    it('locks and unlocks a user, revoking sessions on lock', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      revocations.length = 0;
      const locked = await request(server())
        .post(`/api/v1/admin/users/${staff.id}/lock`)
        .set(as(owner))
        .expect(200);
      expect(locked.body.data.status).toBe('locked');
      expect(revocations).toContainEqual({ userId: staff.id, reason: 'account-locked' });

      await users.update(
        { id: staff.id },
        { failedLoginAttempts: 3, lockedUntil: new Date(Date.now() + 60_000) },
      );
      const unlocked = await request(server())
        .post(`/api/v1/admin/users/${staff.id}/unlock`)
        .set(as(owner))
        .expect(200);
      expect(unlocked.body.data.status).toBe('active');
      const stored = await users.findOneByOrFail({ id: staff.id });
      expect(stored.failedLoginAttempts).toBe(0);
      expect(stored.lockedUntil).toBeNull();
    });

    it('enforces who may lock whom', async () => {
      const admin = await makeUser(Role.ADMIN);
      const staff = await makeUser(Role.STAFF);
      const otherAdmin = await makeUser(Role.ADMIN);
      const owner = await makeUser(Role.OWNER);
      await request(server())
        .post(`/api/v1/admin/users/${staff.id}/lock`)
        .set(as(admin))
        .expect(200);
      await request(server())
        .post(`/api/v1/admin/users/${otherAdmin.id}/lock`)
        .set(as(admin))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${owner.id}/lock`)
        .set(as(admin))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${owner.id}/unlock`)
        .set(as(admin))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${staff.id}/lock`)
        .set(as(staff))
        .expect(403);
    });

    it('nobody can lock themselves', async () => {
      const owner = await makeUser(Role.OWNER);
      await makeUser(Role.OWNER);
      await request(server())
        .post(`/api/v1/admin/users/${owner.id}/lock`)
        .set(as(owner))
        .expect(403);
    });

    it('does not let an owner lock or unlock another owner', async () => {
      const owner = await makeUser(Role.OWNER);
      const other = await makeUser(Role.OWNER);
      await request(server())
        .post(`/api/v1/admin/users/${other.id}/lock`)
        .set(as(owner))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${other.id}/unlock`)
        .set(as(owner))
        .expect(403);
    });

    it('returns 404 for unknown users', async () => {
      const owner = await makeUser(Role.OWNER);
      await request(server())
        .post('/api/v1/admin/users/00000000-0000-4000-8000-000000000000/lock')
        .set(as(owner))
        .expect(404);
    });
  });

  describe('reset password', () => {
    it('sets a one-time temporary password, forces a change and revokes sessions', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      revocations.length = 0;
      const response = await request(server())
        .post(`/api/v1/admin/users/${staff.id}/reset-password`)
        .set(as(owner))
        .expect(200);
      expect(response.body.data.temporaryPassword).toHaveLength(16);
      expect(response.body.data.mustChangePassword).toBe(true);
      expect(revocations).toContainEqual({ userId: staff.id, reason: 'password-reset-by-admin' });
      const stored = await users
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .where('u.id = :id', { id: staff.id })
        .getOneOrFail();
      expect(await usersService.verifyPassword(stored, PASSWORD)).toBe(false);
      expect(await usersService.verifyPassword(stored, response.body.data.temporaryPassword)).toBe(
        true,
      );
    });

    it('follows the management rules and cannot target yourself', async () => {
      const admin = await makeUser(Role.ADMIN);
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      await request(server())
        .post(`/api/v1/admin/users/${owner.id}/reset-password`)
        .set(as(admin))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${admin.id}/reset-password`)
        .set(as(admin))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${owner.id}/reset-password`)
        .set(as(owner))
        .expect(403);
      await request(server())
        .post(`/api/v1/admin/users/${staff.id}/reset-password`)
        .set(as(staff))
        .expect(403);
    });
  });

  describe('delete', () => {
    it('soft deletes, frees the email and purges credentials', async () => {
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      const purged: string[] = [];
      context.moduleRef
        .get(EventEmitter2)
        .on(UserEvent.CREDENTIALS_PURGE_REQUESTED, (payload: { userId: string }) => {
          purged.push(payload.userId);
        });
      await request(server()).delete(`/api/v1/admin/users/${staff.id}`).set(as(owner)).expect(204);
      await request(server()).get(`/api/v1/admin/users/${staff.id}`).set(as(owner)).expect(404);
      const row = await users.findOne({ where: { id: staff.id }, withDeleted: true });
      expect(row?.deletedAt).not.toBeNull();
      expect(purged).toContain(staff.id);
      await usersService.create({
        fullName: 'Reuse',
        email: staff.email,
        phone: staff.phone,
        password: PASSWORD,
        role: Role.STAFF,
      });
    });

    it('follows the management rules, cannot delete yourself and protects the last owner', async () => {
      const admin = await makeUser(Role.ADMIN);
      const owner = await makeUser(Role.OWNER);
      const staff = await makeUser(Role.STAFF);
      await request(server()).delete(`/api/v1/admin/users/${owner.id}`).set(as(admin)).expect(403);
      await request(server()).delete(`/api/v1/admin/users/${admin.id}`).set(as(admin)).expect(403);
      await request(server()).delete(`/api/v1/admin/users/${staff.id}`).set(as(staff)).expect(403);
      await request(server()).delete(`/api/v1/admin/users/${owner.id}`).set(as(owner)).expect(403);

      const otherOwner = await makeUser(Role.OWNER);
      await request(server())
        .delete(`/api/v1/admin/users/${otherOwner.id}`)
        .set(as(owner))
        .expect(403);
      await request(server())
        .delete('/api/v1/admin/users/00000000-0000-4000-8000-000000000000')
        .set(as(admin))
        .expect(404);
    });

    it('allows an admin to delete staff', async () => {
      const admin = await makeUser(Role.ADMIN);
      const staff = await makeUser(Role.STAFF);
      await request(server()).delete(`/api/v1/admin/users/${staff.id}`).set(as(admin)).expect(204);
    });
  });
});
