import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Permission } from '../../../common/constants/permissions';
import {
  ContactCreatedEvent,
  DomainEvent,
  PostSubmittedForReviewEvent,
  ProductSubmittedForReviewEvent,
} from '../../../common/constants/domain-events';
import {
  NotificationType,
  PROJECT_SUBMITTED_FOR_REVIEW_EVENT,
  ProjectSubmittedForReviewPayload,
} from '../constants/notification.constants';
import { NotificationPublisherService } from '../services/notification-publisher.service';

const MAX_NAME_LENGTH = 200;

const clip = (value: string): string =>
  value.length > MAX_NAME_LENGTH ? `${value.slice(0, MAX_NAME_LENGTH - 1)}…` : value;

@Injectable()
export class NotificationEventsListener {
  constructor(private readonly publisher: NotificationPublisherService) {}

  @OnEvent(DomainEvent.CONTACT_CREATED)
  async onContactCreated(event: ContactCreatedEvent): Promise<void> {
    const sender = clip(event.fullName);
    const subject = event.subject ? clip(event.subject) : null;
    await this.publisher.notifyStaffWithPermission(
      Permission.CONTACT_READ,
      {
        type: NotificationType.CONTACT_CREATED,
        title: { vi: `Liên hệ mới từ ${sender}`, en: `New contact message from ${sender}` },
        body: {
          vi: subject ?? 'Khách hàng vừa gửi một tin nhắn qua biểu mẫu liên hệ.',
          en: subject ?? 'A visitor just sent a message through the contact form.',
        },
        entityName: 'Contact',
        entityId: event.contactId,
      },
      null,
    );
  }

  @OnEvent(DomainEvent.POST_SUBMITTED_FOR_REVIEW)
  async onPostSubmitted(event: PostSubmittedForReviewEvent): Promise<void> {
    const title = clip(event.title);
    await this.publisher.notifyStaffWithPermission(
      Permission.POST_PUBLISH,
      {
        type: NotificationType.POST_SUBMITTED_FOR_REVIEW,
        title: { vi: 'Bài viết chờ duyệt', en: 'Post awaiting review' },
        body: {
          vi: `"${title}" đang chờ được phê duyệt.`,
          en: `"${title}" is waiting for approval.`,
        },
        entityName: 'Post',
        entityId: event.postId,
      },
      event.authorId,
    );
  }

  @OnEvent(DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW)
  async onProductSubmitted(event: ProductSubmittedForReviewEvent): Promise<void> {
    const name = clip(event.name);
    await this.publisher.notifyStaffWithPermission(
      Permission.PRODUCT_PUBLISH,
      {
        type: NotificationType.PRODUCT_SUBMITTED_FOR_REVIEW,
        title: { vi: 'Sản phẩm chờ duyệt', en: 'Product awaiting review' },
        body: {
          vi: `"${name}" đang chờ được phê duyệt.`,
          en: `"${name}" is waiting for approval.`,
        },
        entityName: 'Product',
        entityId: event.productId,
      },
      event.authorId,
    );
  }

  @OnEvent(PROJECT_SUBMITTED_FOR_REVIEW_EVENT)
  async onProjectSubmitted(event: ProjectSubmittedForReviewPayload): Promise<void> {
    const title = clip(event.title);
    await this.publisher.notifyStaffWithPermission(
      Permission.PROJECT_PUBLISH,
      {
        type: NotificationType.PROJECT_SUBMITTED_FOR_REVIEW,
        title: { vi: 'Dự án chờ duyệt', en: 'Project awaiting review' },
        body: {
          vi: `"${title}" đang chờ được phê duyệt.`,
          en: `"${title}" is waiting for approval.`,
        },
        entityName: 'Project',
        entityId: event.projectId,
      },
      event.authorId,
    );
  }
}
