import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Role } from '../../src/common/enums/role.enum';
import { ClientLocationStatus } from '../../src/modules/client-locations/entities/client-location.entity';
import { ContactStatus } from '../../src/modules/contacts/entities/contact.entity';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { TestimonialStatus } from '../../src/modules/testimonials/entities/testimonial.entity';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  as,
  backdate,
  daysAgo,
  OPERATIONS_ENTITIES,
  resetDatabase,
  seedAuditEntry,
  seedClientLocation,
  seedContact,
  seedMedia,
  seedPost,
  seedProduct,
  seedProject,
  seedService,
  seedTestimonial,
  seedUser,
  TEST_USERS,
} from './support/operations-fixtures';

describe('dashboard (e2e)', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const summaryUrl = '/api/v1/admin/dashboard/summary';
  const activityUrl = '/api/v1/admin/dashboard/recent-activity';

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: OPERATIONS_ENTITIES,
      imports: [DashboardModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.dataSource, context.schema);
  });

  describe('permission matrix', () => {
    it.each([
      ['summary', summaryUrl],
      ['recent activity', activityUrl],
    ])('%s rejects anonymous callers with 401', async (_name, url) => {
      await request(server()).get(url).expect(401);
    });

    it.each([
      ['summary', summaryUrl],
      ['recent activity', activityUrl],
    ])('%s rejects customers with 403', async (_name, url) => {
      await request(server()).get(url).set(as(TEST_USERS.customer)).expect(403);
    });

    it.each([
      ['staff', TEST_USERS.staff],
      ['admin', TEST_USERS.admin],
      ['owner', TEST_USERS.owner],
    ])('%s can read both endpoints', async (_name, user) => {
      await request(server()).get(summaryUrl).set(as(user)).expect(200);
      await request(server()).get(activityUrl).set(as(user)).expect(200);
    });

    it('rejects an unsupported locale', async () => {
      await request(server()).get(`${summaryUrl}?locale=fr`).set(as(TEST_USERS.admin)).expect(400);
    });
  });

  describe('summary', () => {
    it('returns zeros for an empty database', async () => {
      const response = await request(server())
        .get(summaryUrl)
        .set(as(TEST_USERS.admin))
        .expect(200);
      const data = response.body.data;
      expect(data.locale).toBe('vi');
      expect(data.posts.total).toBe(0);
      expect(data.posts.changePercent).toBeNull();
      expect(data.contacts.unread).toBe(0);
      expect(data.mediaAssets.total).toBe(0);
    });

    it('counts rows by status and never counts soft-deleted rows', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedPost(dataSource, { status: PublicationStatus.DRAFT });
      await seedPost(dataSource, { status: PublicationStatus.IN_REVIEW });
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED, deleted: true });
      await seedProduct(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProduct(dataSource, { status: PublicationStatus.ARCHIVED, deleted: true });
      await seedProject(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProject(dataSource, { deleted: true });
      await seedService(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedService(dataSource, { status: PublicationStatus.DRAFT, deleted: true });
      await seedTestimonial(dataSource, { status: TestimonialStatus.PUBLISHED });
      await seedTestimonial(dataSource, { status: TestimonialStatus.HIDDEN });
      await seedTestimonial(dataSource, { status: TestimonialStatus.PUBLISHED, deleted: true });
      await seedClientLocation(dataSource, { status: ClientLocationStatus.PUBLISHED });
      await seedClientLocation(dataSource, { deleted: true });
      await seedMedia(dataSource);
      await seedMedia(dataSource, { deleted: true });

      const response = await request(server())
        .get(summaryUrl)
        .set(as(TEST_USERS.admin))
        .expect(200);
      const data = response.body.data;

      expect(data.posts.total).toBe(3);
      expect(data.posts.byStatus).toEqual({ draft: 1, in_review: 1, published: 1, archived: 0 });
      expect(data.products.total).toBe(1);
      expect(data.products.byStatus.published).toBe(1);
      expect(data.projects.total).toBe(1);
      expect(data.services.total).toBe(1);
      expect(data.testimonials.total).toBe(2);
      expect(data.testimonials.byStatus).toEqual({ published: 1, hidden: 1 });
      expect(data.clientLocations.total).toBe(1);
      expect(data.mediaAssets.total).toBe(1);
    });

    it('reports customers, staff accounts and contact statuses separately', async () => {
      const { dataSource } = context;
      await seedUser(dataSource, { role: Role.CUSTOMER });
      await seedUser(dataSource, { role: Role.CUSTOMER });
      await seedUser(dataSource, { role: Role.CUSTOMER, deleted: true });
      await seedUser(dataSource, { role: Role.STAFF });
      await seedUser(dataSource, { role: Role.ADMIN });
      await seedUser(dataSource, { role: Role.OWNER });
      await seedUser(dataSource, { role: Role.STAFF, deleted: true });
      await seedContact(dataSource, { status: ContactStatus.NEW });
      await seedContact(dataSource, { status: ContactStatus.NEW });
      await seedContact(dataSource, { status: ContactStatus.SEEN });
      await seedContact(dataSource, { status: ContactStatus.REPLIED });
      await seedContact(dataSource, { status: ContactStatus.ARCHIVED });
      await seedContact(dataSource, { status: ContactStatus.NEW, deleted: true });

      const response = await request(server())
        .get(summaryUrl)
        .set(as(TEST_USERS.staff))
        .expect(200);
      const data = response.body.data;

      expect(data.customers.total).toBe(2);
      // The seeded owner is invisible to staff, so only the admin and the staff member count
      expect(data.staffUsers.total).toBe(2);
      expect(data.contacts.total).toBe(5);
      expect(data.contacts.byStatus).toEqual({ new: 2, seen: 1, replied: 1, archived: 1 });
      expect(data.contacts.unread).toBe(2);

      const ownerView = await request(server())
        .get(summaryUrl)
        .set(as(TEST_USERS.owner))
        .expect(200);
      expect(ownerView.body.data.staffUsers.total).toBe(3);
    });

    it('compares the last 30 days with the 30 days before', async () => {
      const { dataSource } = context;
      const older = await seedPost(dataSource);
      await backdate(dataSource, Post, older.id, { createdAt: daysAgo(45) });
      const ancient = await seedPost(dataSource);
      await backdate(dataSource, Post, ancient.id, { createdAt: daysAgo(120) });
      await seedPost(dataSource);
      await seedPost(dataSource);
      await seedPost(dataSource);

      const response = await request(server())
        .get(summaryUrl)
        .set(as(TEST_USERS.admin))
        .expect(200);
      const posts = response.body.data.posts;

      expect(posts.total).toBe(5);
      expect(posts.createdLast30Days).toBe(3);
      expect(posts.createdPrevious30Days).toBe(1);
      expect(posts.changePercent).toBe(200);
    });

    it('echoes the requested locale', async () => {
      const response = await request(server())
        .get(`${summaryUrl}?locale=en`)
        .set(as(TEST_USERS.admin))
        .expect(200);
      expect(response.body.data.locale).toBe('en');
    });
  });

  describe('recent activity', () => {
    it('returns the 15 latest entries, newest first', async () => {
      for (let index = 0; index < 18; index += 1) {
        await seedAuditEntry(context.dataSource, {
          action: `post.updated`,
          actorName: `Actor ${index}`,
          occurredAt: daysAgo(18 - index),
        });
      }

      const response = await request(server())
        .get(activityUrl)
        .set(as(TEST_USERS.staff))
        .expect(200);
      const items = response.body.data as { actorName: string; occurredAt: string }[];

      expect(items).toHaveLength(15);
      expect(items[0].actorName).toBe('Actor 17');
      const times = items.map((item) => Date.parse(item.occurredAt));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it('exposes the documented fields only', async () => {
      await seedAuditEntry(context.dataSource, { action: 'post.created' });
      const response = await request(server())
        .get(activityUrl)
        .set(as(TEST_USERS.staff))
        .expect(200);
      expect(Object.keys(response.body.data[0]).sort()).toEqual([
        'action',
        'actorName',
        'entityId',
        'entityName',
        'id',
        'occurredAt',
      ]);
    });

    it('hides security events from staff but shows them to roles with audit-log:read', async () => {
      await seedAuditEntry(context.dataSource, { action: 'post.created' });
      await seedAuditEntry(context.dataSource, { action: 'auth.login-failed' });
      await seedAuditEntry(context.dataSource, { action: 'auth.password-reset' });

      const staff = await request(server()).get(activityUrl).set(as(TEST_USERS.staff)).expect(200);
      expect((staff.body.data as { action: string }[]).map((item) => item.action)).toEqual([
        'post.created',
      ]);

      for (const user of [TEST_USERS.admin, TEST_USERS.owner]) {
        const response = await request(server()).get(activityUrl).set(as(user)).expect(200);
        expect(response.body.data).toHaveLength(3);
      }
    });
  });
});
