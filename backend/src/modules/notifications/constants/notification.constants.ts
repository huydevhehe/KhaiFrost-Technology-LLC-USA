export const NOTIFICATION_RETENTION_DAYS = 90;

export const PROJECT_SUBMITTED_FOR_REVIEW_EVENT = 'project.submitted-for-review';

export const NotificationType = {
  CONTACT_CREATED: 'contact.created',
  POST_SUBMITTED_FOR_REVIEW: 'post.submitted-for-review',
  PRODUCT_SUBMITTED_FOR_REVIEW: 'product.submitted-for-review',
  PROJECT_SUBMITTED_FOR_REVIEW: 'project.submitted-for-review',
} as const;

export type NotificationTypeName = (typeof NotificationType)[keyof typeof NotificationType];

export interface ProjectSubmittedForReviewPayload {
  projectId: string;
  title: string;
  authorId: string | null;
}
