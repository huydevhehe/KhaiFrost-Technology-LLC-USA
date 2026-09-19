import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import request from 'supertest';
import { ContactCreatedEvent, DomainEvent } from '../../src/common/constants/domain-events';
import { CONTACT_ENTITIES, ContactsModule } from '../../src/modules/contacts/contacts.module';
import { Contact } from '../../src/modules/contacts/entities/contact.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { ADMIN_ID, STAFF_ID, asAdmin, asCustomer, asStaff } from '../testimonials/support';

@Injectable()
class ContactEventRecorder {
  readonly events: ContactCreatedEvent[] = [];

  @OnEvent(DomainEvent.CONTACT_CREATED)
  record(event: ContactCreatedEvent): void {
    this.events.push(event);
  }
}

describe('contacts (e2e)', () => {
  let context: ModuleTestingContext;
  let recorder: ContactEventRecorder;
  const server = () => context.app.getHttpServer();
  const publicUrl = '/api/v1/public/contact';
  const adminUrl = '/api/v1/admin/contacts';
  let counter = 0;

  const submit = (overrides: Record<string, unknown> = {}) => {
    counter += 1;
    return request(server())
      .post(publicUrl)
      .set('User-Agent', 'jest-agent')
      .send({
        name: 'Nguyễn Minh Khôi',
        email: `khoi${counter}@example.com`,
        message: `Xin tư vấn giải pháp số ${counter}`,
        ...overrides,
      });
  };
  const contactsRepository = () => context.dataSource.getRepository(Contact);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: CONTACT_ENTITIES,
      imports: [ContactsModule],
      providers: [ContactEventRecorder],
    });
    recorder = context.moduleRef.get(ContactEventRecorder);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('public submission', () => {
    it('stores a valid message, normalises the phone and emits the event after saving', async () => {
      const before = recorder.events.length;
      const response = await submit({
        name: '  Trần Bảo Ngọc  ',
        email: 'Ngoc.Tran@Example.com',
        phone: '0902 333 111',
        subject: 'services',
        locale: 'en',
        sourcePage: '/lien-he',
      });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ data: { received: true } });

      const stored = await contactsRepository().findOneByOrFail({ email: 'ngoc.tran@example.com' });
      expect(stored).toMatchObject({
        fullName: 'Trần Bảo Ngọc',
        phone: '+84902333111',
        subject: 'services',
        locale: 'en',
        sourcePage: '/lien-he',
        status: 'new',
        isSpam: false,
        assignedToId: null,
        handledAt: null,
      });
      expect(recorder.events).toHaveLength(before + 1);
      expect(recorder.events[before]).toMatchObject({
        contactId: stored.id,
        email: 'ngoc.tran@example.com',
        phone: '+84902333111',
        locale: 'en',
      });
    });

    it('applies the same rules as the website form', async () => {
      const cases: Record<string, unknown>[] = [
        { name: '' },
        { name: '   ' },
        { email: '' },
        { email: 'not-an-email' },
        { email: 'a b@example.com' },
        { message: '' },
        { message: '   ' },
        { message: 'x'.repeat(5001) },
        { name: 'x'.repeat(151) },
        { subject: 'x'.repeat(201) },
        { phone: 'abc' },
        { locale: 'fr' },
        { unknownField: 1 },
      ];
      for (const overrides of cases) {
        const response = await submit(overrides);
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_FAILED');
      }
      const missing = await request(server()).post(publicUrl).send({});
      expect(missing.status).toBe(400);
      const fields = (missing.body.error.details as { field: string }[]).map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'message']));
    });

    it('treats subject and phone as optional, including empty strings', async () => {
      const response = await submit({ subject: '', phone: '' });
      expect(response.status).toBe(201);
      const stored = await contactsRepository().findOneByOrFail({
        email: `khoi${counter}@example.com`,
      });
      expect(stored.subject).toBeNull();
      expect(stored.phone).toBeNull();
    });

    it('silently drops honeypot submissions with the normal response', async () => {
      const before = await contactsRepository().count();
      const events = recorder.events.length;
      const response = await submit({ website: 'http://spam.example' });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ data: { received: true } });
      expect(await contactsRepository().count()).toBe(before);
      expect(recorder.events).toHaveLength(events);

      const emptyHoneypot = await submit({ website: '' });
      expect(emptyHoneypot.status).toBe(201);
      expect(await contactsRepository().count()).toBe(before + 1);
    });

    it('ignores the same email and message within ten minutes but accepts them later', async () => {
      const body = { email: 'dupe@example.com', message: 'Cùng một nội dung' };
      const events = recorder.events.length;
      expect((await submit(body)).status).toBe(201);
      const again = await submit(body);
      expect(again.status).toBe(201);
      expect(again.body).toEqual({ data: { received: true } });
      expect(await contactsRepository().countBy({ email: 'dupe@example.com' })).toBe(1);
      expect(recorder.events).toHaveLength(events + 1);

      expect((await submit({ ...body, message: 'Nội dung khác' })).status).toBe(201);
      expect(await contactsRepository().countBy({ email: 'dupe@example.com' })).toBe(2);

      await context.dataSource.query(
        "UPDATE contacts SET created_at = now() - interval '11 minutes' WHERE email = 'dupe@example.com'",
      );
      expect((await submit(body)).status).toBe(201);
      expect(await contactsRepository().countBy({ email: 'dupe@example.com' })).toBe(3);
    });
  });

  describe('admin API', () => {
    let contactId: string;

    beforeAll(async () => {
      await submit({
        name: 'Sarah Johnson',
        email: 'sarah.j@coldchainco.com',
        subject: 'AWS migration',
      });
      contactId = (await contactsRepository().findOneByOrFail({ email: 'sarah.j@coldchainco.com' }))
        .id;
    });

    it('enforces the permission matrix', async () => {
      await request(server()).get(adminUrl).expect(401);
      await request(server()).get(adminUrl).set(asCustomer()).expect(403);
      await request(server()).get(adminUrl).set(asStaff()).expect(200);
      await request(server()).get(`${adminUrl}/summary`).set(asStaff()).expect(200);
      await request(server()).get(`${adminUrl}/${contactId}`).set(asStaff()).expect(200);
      await request(server()).get(`${adminUrl}/${contactId}/notes`).set(asStaff()).expect(200);

      await request(server())
        .post(`${adminUrl}/${contactId}/assign`)
        .set(asStaff())
        .send({ assignedToId: STAFF_ID })
        .expect(403);
      await request(server()).delete(`${adminUrl}/${contactId}`).set(asStaff()).expect(403);
      await request(server())
        .post(`${adminUrl}/${contactId}/notes`)
        .set(asStaff())
        .send({ note: 'Đã gọi khách' })
        .expect(201);
      await request(server())
        .patch(`${adminUrl}/${contactId}/status`)
        .set(asStaff())
        .send({ status: 'seen' })
        .expect(200);
    });

    it('does not change the status when reading a contact', async () => {
      await submit({ email: 'unread@example.com' });
      const stored = await contactsRepository().findOneByOrFail({ email: 'unread@example.com' });
      const detail = await request(server())
        .get(`${adminUrl}/${stored.id}`)
        .set(asAdmin())
        .expect(200);
      expect(detail.body.data).toMatchObject({ status: 'new', email: 'unread@example.com' });
      expect(detail.body.data.userAgent).toBe('jest-agent');
      expect((await contactsRepository().findOneByOrFail({ id: stored.id })).status).toBe('new');
    });

    it('lists with filters, search, date range, pagination and the unread count', async () => {
      const list = await request(server()).get(adminUrl).set(asStaff()).expect(200);
      expect(list.body.meta).toMatchObject({ page: 1, pageSize: 20 });
      expect(list.body.meta.unreadCount).toBeGreaterThan(0);
      expect(list.body.data[0]).toHaveProperty('messagePreview');

      const search = await request(server())
        .get(adminUrl)
        .query({ search: 'AWS migration' })
        .set(asStaff())
        .expect(200);
      expect(search.body.data.map((item: any) => item.email)).toEqual(['sarah.j@coldchainco.com']);
      const byEmail = await request(server())
        .get(adminUrl)
        .query({ search: 'COLDCHAINCO' })
        .set(asStaff());
      expect(byEmail.body.data).toHaveLength(1);
      const literal = await request(server()).get(adminUrl).query({ search: '%' }).set(asStaff());
      expect(literal.body.data).toHaveLength(0);

      const byStatus = await request(server())
        .get(adminUrl)
        .query({ status: 'seen' })
        .set(asStaff())
        .expect(200);
      expect(byStatus.body.data.every((item: any) => item.status === 'seen')).toBe(true);

      const paged = await request(server())
        .get(adminUrl)
        .query({ pageSize: 2, page: 2, sortBy: 'email', sortOrder: 'asc' })
        .set(asStaff())
        .expect(200);
      expect(paged.body.data).toHaveLength(2);
      expect(paged.body.meta.page).toBe(2);

      const future = await request(server())
        .get(adminUrl)
        .query({ from: '2999-01-01' })
        .set(asStaff())
        .expect(200);
      expect(future.body.data).toHaveLength(0);
      const today = new Date().toISOString().slice(0, 10);
      const inRange = await request(server())
        .get(adminUrl)
        .query({ from: today, to: today })
        .set(asStaff())
        .expect(200);
      expect(inRange.body.meta.total).toBeGreaterThan(0);

      await request(server()).get(adminUrl).query({ status: 'bogus' }).set(asStaff()).expect(400);
      await request(server()).get(adminUrl).query({ from: 'yesterday' }).set(asStaff()).expect(400);
      await request(server()).get(adminUrl).query({ assignedToId: 'x' }).set(asStaff()).expect(400);
    });

    it('moves through the status workflow and records when it was handled', async () => {
      await submit({ email: 'flow@example.com' });
      const id = (await contactsRepository().findOneByOrFail({ email: 'flow@example.com' })).id;
      const put = (status: string, actor = asStaff()) =>
        request(server()).patch(`${adminUrl}/${id}/status`).set(actor).send({ status });

      const skip = await put('replied');
      expect(skip.status).toBe(409);
      expect(skip.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect((await put('new')).status).toBe(409);
      expect((await put('nonsense')).status).toBe(400);

      expect((await put('seen')).body.data.status).toBe('seen');
      const replied = await put('replied');
      expect(replied.body.data.status).toBe('replied');
      expect(replied.body.data.handledAt).toBeTruthy();
      expect((await put('seen')).status).toBe(409);
      expect((await put('archived')).body.data.status).toBe('archived');
      expect((await put('seen')).status).toBe(409);

      await submit({ email: 'archive-fast@example.com' });
      const fast = await contactsRepository().findOneByOrFail({
        email: 'archive-fast@example.com',
      });
      await request(server())
        .patch(`${adminUrl}/${fast.id}/status`)
        .set(asStaff())
        .send({ status: 'archived' })
        .expect(200);
    });

    it('assigns and unassigns (admin only)', async () => {
      const assigned = await request(server())
        .post(`${adminUrl}/${contactId}/assign`)
        .set(asAdmin())
        .send({ assignedToId: STAFF_ID })
        .expect(200);
      expect(assigned.body.data.assignedToId).toBe(STAFF_ID);
      const byAssignee = await request(server())
        .get(adminUrl)
        .query({ assignedToId: STAFF_ID })
        .set(asAdmin())
        .expect(200);
      expect(byAssignee.body.data.map((item: any) => item.id)).toEqual([contactId]);
      const cleared = await request(server())
        .post(`${adminUrl}/${contactId}/assign`)
        .set(asAdmin())
        .send({ assignedToId: null })
        .expect(200);
      expect(cleared.body.data.assignedToId).toBeNull();
      await request(server())
        .post(`${adminUrl}/${contactId}/assign`)
        .set(asAdmin())
        .send({ assignedToId: 'nope' })
        .expect(400);
      await request(server())
        .post(`${adminUrl}/00000000-0000-4000-8000-00000000ffff/assign`)
        .set(asAdmin())
        .send({ assignedToId: null })
        .expect(404);
    });

    it('keeps internal notes in order with their author', async () => {
      await request(server())
        .post(`${adminUrl}/${contactId}/notes`)
        .set(asAdmin())
        .send({ note: 'Ghi chú thứ hai' })
        .expect(201);
      await request(server())
        .post(`${adminUrl}/${contactId}/notes`)
        .set(asAdmin())
        .send({ note: '' })
        .expect(400);
      await request(server())
        .post(`${adminUrl}/${contactId}/notes`)
        .set(asAdmin())
        .send({ note: 'x'.repeat(2001) })
        .expect(400);
      const notes = await request(server())
        .get(`${adminUrl}/${contactId}/notes`)
        .set(asAdmin())
        .expect(200);
      expect(notes.body.data.map((note: any) => note.note)).toEqual([
        'Đã gọi khách',
        'Ghi chú thứ hai',
      ]);
      expect(notes.body.data.map((note: any) => note.authorId)).toEqual([STAFF_ID, ADMIN_ID]);
    });

    it('summarises counts per status', async () => {
      const summary = await request(server()).get(`${adminUrl}/summary`).set(asAdmin()).expect(200);
      const data = summary.body.data;
      expect(data.total).toBe(data.new + data.seen + data.replied + data.archived);
      expect(data.new).toBeGreaterThan(0);
      expect(data.archived).toBeGreaterThan(0);
      const list = await request(server()).get(adminUrl).set(asAdmin());
      expect(list.body.meta.unreadCount).toBe(data.new);
    });

    it('soft deletes and hides deleted contacts', async () => {
      await submit({ email: 'delete-me@example.com' });
      const id = (await contactsRepository().findOneByOrFail({ email: 'delete-me@example.com' }))
        .id;
      await request(server()).delete(`${adminUrl}/${id}`).set(asAdmin()).expect(204);
      await request(server()).get(`${adminUrl}/${id}`).set(asAdmin()).expect(404);
      await request(server()).delete(`${adminUrl}/${id}`).set(asAdmin()).expect(404);
      await request(server()).get(`${adminUrl}/${id}/notes`).set(asAdmin()).expect(404);
      expect(await contactsRepository().findOneBy({ id })).toBeNull();
      expect(
        await contactsRepository().findOne({ where: { id }, withDeleted: true }),
      ).not.toBeNull();
    });
  });
});
