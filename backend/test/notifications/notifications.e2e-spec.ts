import { randomUUID } from 'node:crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import {
  ContactCreatedEvent,
  DomainEvent,
  PostSubmittedForReviewEvent,
  ProductSubmittedForReviewEvent,
} from '../../src/common/constants/domain-events';
import { Locale } from '../../src/common/enums/locale.enum';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import {
  NOTIFICATION_RETENTION_DAYS,
  PROJECT_SUBMITTED_FOR_REVIEW_EVENT,
} from '../../src/modules/notifications/constants/notification.constants';
import { Notification } from '../../src/modules/notifications/entities/notification.entity';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { NotificationRetentionService } from '../../src/modules/notifications/services/notification-retention.service';
import { User } from '../../src/modules/users/entities/user.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { as, daysAgo, seedUser, TEST_USERS } from '../dashboard/support/operations-fixtures';

interface NotificationBody {
  id: string;
  type: string;
  title: string;
  body: string;
  entityName: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

describe('notifications (e2e)', () => {
  let context: ModuleTestingContext;
  let events: EventEmitter2;
  const server = () => context.app.getHttpServer();
  const baseUrl = '/api/v1/admin/notifications';
  const repository = () => context.dataSource.getRepository(Notification);

  const staff = TEST_USERS.staff;
  const otherStaff = TEST_USERS.otherStaff;
  const admin = TEST_USERS.admin;
  const owner = TEST_USERS.owner;

  const seedNotification = async (
    recipientId: string,
    options: { title?: string; readAt?: Date | null; createdAt?: Date } = {},
  ): Promise<Notification> => {
    const saved = await repository().save(
      repository().create({
        recipientId,
        type: 'contact.created',
        title: { vi: options.title ?? 'Tiêu đề', en: options.title ?? 'Title' },
        body: { vi: 'Nội dung', en: 'Body' },
        entityName: 'Contact',
        entityId: randomUUID(),
        readAt: options.readAt ?? null,
      }),
    );
    if (options.createdAt) {
      await repository().update({ id: saved.id }, { createdAt: options.createdAt });
    }
    return saved;
  };

  const notificationsFor = (recipientId: string) =>
    repository().find({ where: { recipientId }, order: { createdAt: 'ASC' } });

  const list = async (query: string, user = staff) => {
    const response = await request(server()).get(`${baseUrl}${query}`).set(as(user)).expect(200);
    return { items: response.body.data as NotificationBody[], meta: response.body.meta };
  };

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, User, Notification],
      imports: [NotificationsModule],
    });
    events = context.moduleRef.get(EventEmitter2);
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await context.dataSource.getRepository(Notification).clear();
    await context.dataSource.createQueryBuilder().delete().from(User).execute();
  });

  describe('permission matrix', () => {
    const someId = '00000000-0000-4000-8000-000000000999';
    const calls: [string, string, string][] = [
      ['list', 'get', baseUrl],
      ['unread count', 'get', `${baseUrl}/unread-count`],
      ['mark one read', 'post', `${baseUrl}/${someId}/read`],
      ['mark all read', 'post', `${baseUrl}/read-all`],
      ['delete', 'delete', `${baseUrl}/${someId}`],
    ];

    it.each(calls)('%s rejects anonymous callers with 401', async (_name, method, url) => {
      await (request(server()) as unknown as Record<string, (url: string) => request.Test>)
        [method](url)
        .expect(401);
    });

    it.each(calls)('%s rejects customers with 403', async (_name, method, url) => {
      await (request(server()) as unknown as Record<string, (url: string) => request.Test>)
        [method](url)
        .set(as(TEST_USERS.customer))
        .expect(403);
    });

    it.each([
      ['staff', staff],
      ['admin', admin],
      ['owner', owner],
    ])('%s can use the inbox', async (_name, user) => {
      await request(server()).get(baseUrl).set(as(user)).expect(200);
      await request(server()).get(`${baseUrl}/unread-count`).set(as(user)).expect(200);
      await request(server()).post(`${baseUrl}/read-all`).set(as(user)).expect(200);
    });
  });

  describe('fan-out rules', () => {
    beforeEach(async () => {
      await seedUser(context.dataSource, { id: owner.id, role: Role.OWNER });
      await seedUser(context.dataSource, { id: admin.id, role: Role.ADMIN });
      await seedUser(context.dataSource, { id: staff.id, role: Role.STAFF });
      await seedUser(context.dataSource, { id: otherStaff.id, role: Role.STAFF });
      await seedUser(context.dataSource, { id: TEST_USERS.customer.id, role: Role.CUSTOMER });
    });

    const contactEvent = (overrides: Partial<ContactCreatedEvent> = {}): ContactCreatedEvent => ({
      contactId: randomUUID(),
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      phone: null,
      subject: 'Cần báo giá',
      locale: Locale.VI,
      ...overrides,
    });

    it('notifies every active staff account holding contact:read when a contact arrives', async () => {
      await seedUser(context.dataSource, { role: Role.STAFF, status: 'locked' });
      await seedUser(context.dataSource, { role: Role.ADMIN, deleted: true });
      const event = contactEvent();

      await events.emitAsync(DomainEvent.CONTACT_CREATED, event);

      const total = await repository().find();
      expect(total.map((row) => row.recipientId).sort()).toEqual(
        [owner.id, admin.id, staff.id, otherStaff.id].sort(),
      );
      const [first] = await notificationsFor(staff.id);
      expect(first).toMatchObject({
        type: 'contact.created',
        entityName: 'Contact',
        entityId: event.contactId,
        readAt: null,
      });
      expect(first.title.vi).toContain('Nguyễn Văn A');
      expect(first.title.en).toContain('Nguyễn Văn A');
      expect(first.body).toEqual({ vi: 'Cần báo giá', en: 'Cần báo giá' });
    });

    it('never notifies customers', async () => {
      await events.emitAsync(DomainEvent.CONTACT_CREATED, contactEvent());
      expect(await notificationsFor(TEST_USERS.customer.id)).toEqual([]);
    });

    it('falls back to a generic body when the contact has no subject', async () => {
      await events.emitAsync(DomainEvent.CONTACT_CREATED, contactEvent({ subject: null }));
      const [first] = await notificationsFor(staff.id);
      expect(first.body.vi).toMatch(/liên hệ/);
      expect(first.body.en).toMatch(/contact form/);
    });

    it('sends review requests only to users who can publish, never to staff', async () => {
      const event: PostSubmittedForReviewEvent = {
        postId: randomUUID(),
        title: 'Bài chờ duyệt',
        authorId: staff.id,
      };

      await events.emitAsync(DomainEvent.POST_SUBMITTED_FOR_REVIEW, event);

      const rows = await repository().find();
      expect(rows.map((row) => row.recipientId).sort()).toEqual([owner.id, admin.id].sort());
      expect(rows.every((row) => row.type === 'post.submitted-for-review')).toBe(true);
      expect(rows[0]).toMatchObject({ entityName: 'Post', entityId: event.postId });
      expect(rows[0].body.vi).toContain('Bài chờ duyệt');
    });

    it('does not notify the author of the submitted item', async () => {
      await events.emitAsync(DomainEvent.POST_SUBMITTED_FOR_REVIEW, {
        postId: randomUUID(),
        title: 'Bài của quản trị viên',
        authorId: admin.id,
      } satisfies PostSubmittedForReviewEvent);

      const rows = await repository().find();
      expect(rows.map((row) => row.recipientId)).toEqual([owner.id]);
    });

    it('handles products the same way', async () => {
      await events.emitAsync(DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW, {
        productId: randomUUID(),
        name: 'Sản phẩm mới',
        authorId: owner.id,
      } satisfies ProductSubmittedForReviewEvent);

      const rows = await repository().find();
      expect(rows.map((row) => row.recipientId)).toEqual([admin.id]);
      expect(rows[0]).toMatchObject({
        type: 'product.submitted-for-review',
        entityName: 'Product',
      });
    });

    it('handles projects through the project event name', async () => {
      const projectId = randomUUID();

      await events.emitAsync(PROJECT_SUBMITTED_FOR_REVIEW_EVENT, {
        projectId,
        title: 'Dự án mới',
        authorId: staff.id,
      });

      const rows = await repository().find();
      expect(rows.map((row) => row.recipientId).sort()).toEqual([owner.id, admin.id].sort());
      expect(rows[0]).toMatchObject({
        type: 'project.submitted-for-review',
        entityName: 'Project',
        entityId: projectId,
      });
    });

    it('notifies every publisher when the item has no author', async () => {
      await events.emitAsync(DomainEvent.POST_SUBMITTED_FOR_REVIEW, {
        postId: randomUUID(),
        title: 'Bài không tác giả',
        authorId: null,
      } satisfies PostSubmittedForReviewEvent);
      expect(await repository().count()).toBe(2);
    });

    it('shortens very long titles', async () => {
      await events.emitAsync(DomainEvent.POST_SUBMITTED_FOR_REVIEW, {
        postId: randomUUID(),
        title: 'x'.repeat(500),
        authorId: null,
      } satisfies PostSubmittedForReviewEvent);
      const [row] = await repository().find();
      expect(row.body.en.length).toBeLessThan(260);
    });
  });

  describe('inbox', () => {
    it('lists only the caller notifications, newest first, with the unread count in meta', async () => {
      const oldest = await seedNotification(staff.id, { title: 'Cũ nhất', createdAt: daysAgo(3) });
      const middle = await seedNotification(staff.id, {
        title: 'Giữa',
        readAt: new Date(),
        createdAt: daysAgo(2),
      });
      const newest = await seedNotification(staff.id, { title: 'Mới nhất', createdAt: daysAgo(1) });
      await seedNotification(otherStaff.id, { title: 'Của người khác' });

      const { items, meta } = await list('');

      expect(items.map((item) => item.id)).toEqual([newest.id, middle.id, oldest.id]);
      expect(meta).toMatchObject({ total: 3, page: 1, pageSize: 20, unreadCount: 2 });
      expect(items[1]).toMatchObject({ isRead: true });
      expect(items[0]).toMatchObject({ isRead: false, readAt: null });
    });

    it('returns the text in the requested language', async () => {
      await seedNotification(staff.id);
      const vietnamese = await list('');
      const english = await list('?locale=en');
      expect(vietnamese.items[0]).toMatchObject({ title: 'Tiêu đề', body: 'Nội dung' });
      expect(english.items[0]).toMatchObject({ title: 'Title', body: 'Body' });
    });

    it('filters unread notifications and paginates', async () => {
      for (let index = 0; index < 5; index += 1) {
        await seedNotification(staff.id, { createdAt: daysAgo(10 - index) });
      }
      await seedNotification(staff.id, { readAt: new Date() });

      const unread = await list('?unreadOnly=true');
      const secondPage = await list('?pageSize=4&page=2');

      expect(unread.items).toHaveLength(5);
      expect(unread.meta).toMatchObject({ total: 5, unreadCount: 5 });
      expect(secondPage.items).toHaveLength(2);
      expect(secondPage.meta).toMatchObject({ total: 6, totalPages: 2, page: 2 });
    });

    it('rejects invalid query values', async () => {
      await request(server()).get(`${baseUrl}?unreadOnly=maybe`).set(as(staff)).expect(400);
      await request(server()).get(`${baseUrl}?locale=fr`).set(as(staff)).expect(400);
      await request(server()).get(`${baseUrl}?pageSize=1000`).set(as(staff)).expect(400);
    });

    it('reports the unread count for the caller only', async () => {
      await seedNotification(staff.id);
      await seedNotification(staff.id);
      await seedNotification(staff.id, { readAt: new Date() });
      await seedNotification(otherStaff.id);

      const response = await request(server())
        .get(`${baseUrl}/unread-count`)
        .set(as(staff))
        .expect(200);
      expect(response.body.data).toEqual({ count: 2 });
    });

    it('marks one notification as read and keeps the original read time on repeat calls', async () => {
      const notification = await seedNotification(staff.id);

      const first = await request(server())
        .post(`${baseUrl}/${notification.id}/read`)
        .set(as(staff))
        .expect(200);
      expect(first.body.data).toMatchObject({ id: notification.id, isRead: true });
      const readAt = first.body.data.readAt as string;
      expect(readAt).not.toBeNull();

      const second = await request(server())
        .post(`${baseUrl}/${notification.id}/read`)
        .set(as(staff))
        .expect(200);
      expect(second.body.data.readAt).toBe(readAt);
      expect((await repository().findOneByOrFail({ id: notification.id })).readAt).not.toBeNull();
    });

    it('answers 404 for a notification that belongs to someone else', async () => {
      const foreign = await seedNotification(otherStaff.id);

      await request(server()).post(`${baseUrl}/${foreign.id}/read`).set(as(staff)).expect(404);
      await request(server()).delete(`${baseUrl}/${foreign.id}`).set(as(staff)).expect(404);
      // Even an owner cannot touch a colleague's inbox
      await request(server()).delete(`${baseUrl}/${foreign.id}`).set(as(owner)).expect(404);

      const untouched = await repository().findOneByOrFail({ id: foreign.id });
      expect(untouched.readAt).toBeNull();
    });

    it('answers 404 for an unknown id and 400 for a malformed one', async () => {
      await request(server()).post(`${baseUrl}/${randomUUID()}/read`).set(as(staff)).expect(404);
      await request(server()).delete(`${baseUrl}/${randomUUID()}`).set(as(staff)).expect(404);
      await request(server()).post(`${baseUrl}/not-a-uuid/read`).set(as(staff)).expect(400);
      await request(server()).delete(`${baseUrl}/not-a-uuid`).set(as(staff)).expect(400);
    });

    it('marks every notification of the caller as read without touching others', async () => {
      await seedNotification(staff.id);
      await seedNotification(staff.id);
      await seedNotification(staff.id, { readAt: new Date() });
      const foreign = await seedNotification(otherStaff.id);

      const response = await request(server())
        .post(`${baseUrl}/read-all`)
        .set(as(staff))
        .expect(200);

      expect(response.body.data).toEqual({ updated: 2 });
      expect((await list('')).meta.unreadCount).toBe(0);
      expect((await repository().findOneByOrFail({ id: foreign.id })).readAt).toBeNull();
    });

    it('deletes an own notification', async () => {
      const notification = await seedNotification(staff.id);
      await request(server()).delete(`${baseUrl}/${notification.id}`).set(as(staff)).expect(204);
      expect(await repository().findOneBy({ id: notification.id })).toBeNull();
      await request(server()).delete(`${baseUrl}/${notification.id}`).set(as(staff)).expect(404);
    });
  });

  describe('retention', () => {
    it(`removes notifications older than ${NOTIFICATION_RETENTION_DAYS} days and nothing else`, async () => {
      const retention = context.moduleRef.get(NotificationRetentionService);
      const user = await seedUser(context.dataSource, { id: staff.id, role: Role.STAFF });
      const expired = await seedNotification(staff.id, {
        createdAt: daysAgo(NOTIFICATION_RETENTION_DAYS + 1),
      });
      const expiredRead = await seedNotification(staff.id, {
        readAt: new Date(),
        createdAt: daysAgo(400),
      });
      const recent = await seedNotification(staff.id, {
        createdAt: daysAgo(NOTIFICATION_RETENTION_DAYS - 1),
      });
      const fresh = await seedNotification(staff.id);

      const removed = await retention.purgeExpired();

      expect(removed).toBe(2);
      const remaining = (await repository().find()).map((row) => row.id).sort();
      expect(remaining).toEqual([recent.id, fresh.id].sort());
      expect(remaining).not.toContain(expired.id);
      expect(remaining).not.toContain(expiredRead.id);
      expect(
        await context.dataSource.getRepository(User).findOneBy({ id: user.id }),
      ).not.toBeNull();
    });

    it('reports zero when nothing is old enough', async () => {
      const retention = context.moduleRef.get(NotificationRetentionService);
      await seedNotification(staff.id);
      expect(await retention.purgeExpired()).toBe(0);
    });
  });
});
