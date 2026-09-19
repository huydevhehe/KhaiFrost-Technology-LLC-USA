import { Locale } from '../../../common/enums/locale.enum';
import { NotificationResponseDto } from '../dto/notification.dto';
import { Notification } from '../entities/notification.entity';

export function toNotificationResponse(
  notification: Notification,
  locale: Locale,
): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title[locale],
    body: notification.body[locale],
    entityName: notification.entityName,
    entityId: notification.entityId,
    isRead: notification.readAt !== null,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
  };
}
