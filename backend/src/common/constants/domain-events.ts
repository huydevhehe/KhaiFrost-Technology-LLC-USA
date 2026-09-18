import { Locale } from '../enums/locale.enum';

export const DomainEvent = {
  USER_REGISTERED: 'user.registered',
  PASSWORD_RESET_REQUESTED: 'password-reset.requested',
  CONTACT_CREATED: 'contact.created',
  POST_SUBMITTED_FOR_REVIEW: 'post.submitted-for-review',
  PRODUCT_SUBMITTED_FOR_REVIEW: 'product.submitted-for-review',
  // Reserved for a later phase
  ORDER_CREATED: 'order.created',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

export interface UserRegisteredEvent {
  userId: string;
  email: string | null;
  fullName: string;
  locale: Locale;
}

export interface PasswordResetRequestedEvent {
  email: string;
  code: string;
  locale: Locale;
  expiresAt: Date;
}

export interface ContactCreatedEvent {
  contactId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  locale: Locale;
}

export interface PostSubmittedForReviewEvent {
  postId: string;
  title: string;
  authorId: string | null;
}

export interface ProductSubmittedForReviewEvent {
  productId: string;
  name: string;
  authorId: string | null;
}

export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
}

export interface DomainEventPayloads {
  [DomainEvent.USER_REGISTERED]: UserRegisteredEvent;
  [DomainEvent.PASSWORD_RESET_REQUESTED]: PasswordResetRequestedEvent;
  [DomainEvent.CONTACT_CREATED]: ContactCreatedEvent;
  [DomainEvent.POST_SUBMITTED_FOR_REVIEW]: PostSubmittedForReviewEvent;
  [DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW]: ProductSubmittedForReviewEvent;
  [DomainEvent.ORDER_CREATED]: OrderCreatedEvent;
}
