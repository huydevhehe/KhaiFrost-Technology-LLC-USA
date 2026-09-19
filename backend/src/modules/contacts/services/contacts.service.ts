import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { ContactCreatedEvent, DomainEvent } from '../../../common/constants/domain-events';
import { RequestContextService } from '../../../common/context/request-context.service';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { DEFAULT_LOCALE } from '../../../common/enums/locale.enum';
import { conflict, notFound } from '../../../common/exceptions/exception.factories';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { normalizePhone } from '../../../common/utils/normalize-phone';
import {
  CONTACT_SORT_FIELDS,
  ContactAcknowledgementDto,
  ContactDetailResponseDto,
  ContactListItemResponseDto,
  ContactNoteResponseDto,
  ContactSummaryResponseDto,
  CreateContactDto,
  ListContactsQueryDto,
} from '../dto/contact.dto';
import { ContactNote } from '../entities/contact-note.entity';
import { Contact, ContactStatus } from '../entities/contact.entity';

export const CONTACT_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
export const INVALID_CONTACT_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION';

const STATUS_TRANSITIONS: Record<ContactStatus, ContactStatus[]> = {
  [ContactStatus.NEW]: [ContactStatus.SEEN, ContactStatus.ARCHIVED],
  [ContactStatus.SEEN]: [ContactStatus.REPLIED, ContactStatus.ARCHIVED],
  [ContactStatus.REPLIED]: [ContactStatus.ARCHIVED],
  [ContactStatus.ARCHIVED]: [],
};

const PREVIEW_LENGTH = 200;

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(ContactNote) private readonly notes: Repository<ContactNote>,
    private readonly events: EventEmitter2,
    private readonly requestContext: RequestContextService,
  ) {}

  // Bots and repeated submissions get the same acknowledgement so they learn nothing
  async submit(dto: CreateContactDto): Promise<ContactAcknowledgementDto> {
    const acknowledgement = { received: true };
    if (dto.website && dto.website.trim() !== '') return acknowledgement;

    const email = dto.email.toLowerCase();
    const duplicate = await this.contacts.exists({
      where: {
        email,
        message: dto.message,
        isSpam: false,
        createdAt: MoreThanOrEqual(new Date(Date.now() - CONTACT_DUPLICATE_WINDOW_MS)),
      },
    });
    if (duplicate) return acknowledgement;

    const contact = await this.contacts.save(
      this.contacts.create({
        fullName: dto.name,
        email,
        phone: dto.phone ? normalizePhone(dto.phone) : null,
        subject: dto.subject ?? null,
        message: dto.message,
        locale: dto.locale ?? DEFAULT_LOCALE,
        sourcePage: dto.sourcePage ?? null,
        status: ContactStatus.NEW,
        assignedToId: null,
        handledAt: null,
        ipAddress: this.requestContext.ipAddress?.slice(0, 64) ?? null,
        userAgent: this.requestContext.userAgent?.slice(0, 500) ?? null,
        isSpam: false,
      }),
    );

    const payload: ContactCreatedEvent = {
      contactId: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject,
      locale: contact.locale,
    };
    this.events.emit(DomainEvent.CONTACT_CREATED, payload);
    return acknowledgement;
  }

  async list(
    query: ListContactsQueryDto,
  ): Promise<ResponseWithMeta<ContactListItemResponseDto[], Record<string, unknown>>> {
    const builder = this.contacts.createQueryBuilder('contact');
    if (query.status) builder.andWhere('contact.status = :status', { status: query.status });
    if (query.assignedToId) {
      builder.andWhere('contact.assignedToId = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    }
    if (query.from) builder.andWhere('contact.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) builder.andWhere('contact.createdAt <= :to', { to: this.endOfRange(query.to) });
    if (query.search) {
      const pattern = containsPattern(query.search);
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('contact.fullName ILIKE :pattern', { pattern })
            .orWhere('contact.email ILIKE :pattern', { pattern })
            .orWhere('contact.subject ILIKE :pattern', { pattern }),
        ),
      );
    }
    const sort = resolveSort(query, CONTACT_SORT_FIELDS, 'createdAt');
    builder.orderBy(`contact.${sort.field}`, sort.order).addOrderBy('contact.id', 'ASC');

    const page = await paginate(builder, query, (contact) => this.toListItem(contact));
    const unreadCount = await this.contacts.count({ where: { status: ContactStatus.NEW } });
    return new ResponseWithMeta(page.items, { ...page.meta, unreadCount });
  }

  async summary(): Promise<ContactSummaryResponseDto> {
    const rows: { status: ContactStatus; count: string }[] = await this.contacts
      .createQueryBuilder('contact')
      .select('contact.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contact.status')
      .getRawMany();
    const summary = { new: 0, seen: 0, replied: 0, archived: 0, total: 0 };
    for (const row of rows) {
      summary[row.status] = Number(row.count);
      summary.total += Number(row.count);
    }
    return summary;
  }

  // Reading never changes the status; staff move it explicitly
  async getById(id: string): Promise<ContactDetailResponseDto> {
    return this.toDetail(await this.findOrFail(id));
  }

  async updateStatus(id: string, target: ContactStatus): Promise<ContactDetailResponseDto> {
    const contact = await this.findOrFail(id);
    if (!STATUS_TRANSITIONS[contact.status].includes(target)) {
      throw conflict(
        INVALID_CONTACT_STATUS_TRANSITION,
        `A ${contact.status} contact cannot become ${target}`,
      );
    }
    contact.status = target;
    if (target === ContactStatus.REPLIED) contact.handledAt = new Date();
    return this.toDetail(await this.contacts.save(contact));
  }

  async assign(id: string, assignedToId: string | null): Promise<ContactDetailResponseDto> {
    const contact = await this.findOrFail(id);
    contact.assignedToId = assignedToId;
    return this.toDetail(await this.contacts.save(contact));
  }

  async addNote(id: string, authorId: string, note: string): Promise<ContactNoteResponseDto> {
    await this.findOrFail(id);
    const saved = await this.notes.save(this.notes.create({ contactId: id, authorId, note }));
    return this.toNote(saved);
  }

  async listNotes(id: string): Promise<ContactNoteResponseDto[]> {
    await this.findOrFail(id);
    const rows = await this.notes.find({
      where: { contactId: id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.toNote(row));
  }

  async remove(id: string): Promise<void> {
    const result = await this.contacts.softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Contact');
  }

  private async findOrFail(id: string): Promise<Contact> {
    const contact = await this.contacts.findOne({ where: { id } });
    if (!contact) throw notFound('Contact');
    return contact;
  }

  // A bare date means the whole day
  private endOfRange(value: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
  }

  private toListItem(contact: Contact): ContactListItemResponseDto {
    return {
      id: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject,
      messagePreview: contact.message.slice(0, PREVIEW_LENGTH),
      status: contact.status,
      assignedToId: contact.assignedToId,
      locale: contact.locale,
      isSpam: contact.isSpam,
      createdAt: contact.createdAt,
    };
  }

  private toDetail(contact: Contact): ContactDetailResponseDto {
    return {
      ...this.toListItem(contact),
      message: contact.message,
      sourcePage: contact.sourcePage,
      handledAt: contact.handledAt,
      ipAddress: contact.ipAddress,
      userAgent: contact.userAgent,
      version: contact.version,
      updatedAt: contact.updatedAt,
    };
  }

  private toNote(note: ContactNote): ContactNoteResponseDto {
    return {
      id: note.id,
      contactId: note.contactId,
      authorId: note.authorId,
      note: note.note,
      createdAt: note.createdAt,
    };
  }
}
