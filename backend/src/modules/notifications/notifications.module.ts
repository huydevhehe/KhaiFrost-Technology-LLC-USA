import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationsAdminController } from './controllers/notifications-admin.controller';
import { Notification } from './entities/notification.entity';
import { NotificationEventsListener } from './listeners/notification-events.listener';
import { NotificationRecipientsRepository } from './repositories/notification-recipients.repository';
import { NotificationPublisherService } from './services/notification-publisher.service';
import { NotificationRetentionService } from './services/notification-retention.service';
import { NotificationsService } from './services/notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationsAdminController],
  providers: [
    NotificationsService,
    NotificationPublisherService,
    NotificationRetentionService,
    NotificationRecipientsRepository,
    NotificationEventsListener,
  ],
})
export class NotificationsModule {}
