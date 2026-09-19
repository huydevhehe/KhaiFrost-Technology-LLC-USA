import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../../common/constants/permissions';
import { LocalizedText, Notification } from '../entities/notification.entity';
import { NotificationRecipientsRepository } from '../repositories/notification-recipients.repository';

export interface StaffNotificationDraft {
  type: string;
  title: LocalizedText;
  body: LocalizedText;
  entityName: string;
  entityId: string;
}

@Injectable()
export class NotificationPublisherService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly recipients: NotificationRecipientsRepository,
  ) {}

  // Returns how many notifications were created; the item's author never receives one
  async notifyStaffWithPermission(
    permission: Permission,
    draft: StaffNotificationDraft,
    authorId: string | null,
  ): Promise<number> {
    const recipientIds = await this.recipients.findStaffIdsWithPermission(permission, authorId);
    if (recipientIds.length === 0) return 0;
    await this.notifications.insert(
      recipientIds.map((recipientId) => ({
        recipientId,
        type: draft.type,
        title: draft.title,
        body: draft.body,
        entityName: draft.entityName,
        entityId: draft.entityId,
      })),
    );
    return recipientIds.length;
  }
}
