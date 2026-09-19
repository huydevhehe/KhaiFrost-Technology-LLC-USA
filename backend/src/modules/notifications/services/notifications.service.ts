import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { paginate } from '../../../common/dto/paginate';
import { Locale } from '../../../common/enums/locale.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import {
  ListNotificationsQueryDto,
  MarkAllReadResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from '../dto/notification.dto';
import { Notification } from '../entities/notification.entity';
import { toNotificationResponse } from '../mappers/notification.mapper';

// Every method is scoped to the caller: another person's notification behaves as if it did not exist
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
  ) {}

  async list(
    recipientId: string,
    query: ListNotificationsQueryDto,
  ): Promise<ResponseWithMeta<NotificationResponseDto[], Record<string, unknown>>> {
    const builder = this.notifications
      .createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', { recipientId })
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'ASC');
    if (query.unreadOnly) builder.andWhere('notification.readAt IS NULL');

    const [page, unreadCount] = await Promise.all([
      paginate(builder, query, (notification) =>
        toNotificationResponse(notification, query.locale),
      ),
      this.countUnread(recipientId),
    ]);
    return new ResponseWithMeta(page.items, { ...page.meta, unreadCount });
  }

  async getUnreadCount(recipientId: string): Promise<UnreadCountResponseDto> {
    return { count: await this.countUnread(recipientId) };
  }

  async markRead(
    recipientId: string,
    id: string,
    locale: Locale,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notifications.findOneBy({ id, recipientId });
    if (!notification) throw notFound('Notification');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notifications.update({ id, recipientId }, { readAt: notification.readAt });
    }
    return toNotificationResponse(notification, locale);
  }

  async markAllRead(recipientId: string): Promise<MarkAllReadResponseDto> {
    const result = await this.notifications.update(
      { recipientId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  async remove(recipientId: string, id: string): Promise<void> {
    const result = await this.notifications.delete({ id, recipientId });
    if (!result.affected) throw notFound('Notification');
  }

  private countUnread(recipientId: string): Promise<number> {
    return this.notifications.count({ where: { recipientId, readAt: IsNull() } });
  }
}
