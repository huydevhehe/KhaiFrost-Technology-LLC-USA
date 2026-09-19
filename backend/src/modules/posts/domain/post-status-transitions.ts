import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { conflict } from '../../../common/exceptions/exception.factories';
import { PostErrorCode } from '../constants/post-error-codes';

export enum PostWorkflowAction {
  SUBMIT_FOR_REVIEW = 'submit-for-review',
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  REJECT = 'reject',
}

interface Transition {
  from: readonly PublicationStatus[];
  to: PublicationStatus;
}

export const POST_TRANSITIONS: Readonly<Record<PostWorkflowAction, Transition>> = {
  [PostWorkflowAction.SUBMIT_FOR_REVIEW]: {
    from: [PublicationStatus.DRAFT],
    to: PublicationStatus.IN_REVIEW,
  },
  [PostWorkflowAction.PUBLISH]: {
    from: [PublicationStatus.DRAFT, PublicationStatus.IN_REVIEW],
    to: PublicationStatus.PUBLISHED,
  },
  [PostWorkflowAction.UNPUBLISH]: {
    from: [PublicationStatus.PUBLISHED],
    to: PublicationStatus.DRAFT,
  },
  [PostWorkflowAction.ARCHIVE]: {
    from: [PublicationStatus.DRAFT, PublicationStatus.IN_REVIEW, PublicationStatus.PUBLISHED],
    to: PublicationStatus.ARCHIVED,
  },
  // A reviewer sends a post in review back to its author
  [PostWorkflowAction.REJECT]: {
    from: [PublicationStatus.IN_REVIEW],
    to: PublicationStatus.DRAFT,
  },
  [PostWorkflowAction.RESTORE]: {
    from: [PublicationStatus.ARCHIVED],
    to: PublicationStatus.DRAFT,
  },
};

export function canTransition(action: PostWorkflowAction, from: PublicationStatus): boolean {
  return POST_TRANSITIONS[action].from.includes(from);
}

export function resolveTransition(
  action: PostWorkflowAction,
  from: PublicationStatus,
): PublicationStatus {
  if (!canTransition(action, from)) {
    throw conflict(
      PostErrorCode.INVALID_STATUS_TRANSITION,
      `A post that is ${from} cannot be moved with "${action}"`,
      { action, currentStatus: from },
    );
  }
  return POST_TRANSITIONS[action].to;
}

// Staff-level edits are only allowed on unpublished work; anything else needs post:update-any
export function isEditableWithoutUpdateAny(status: PublicationStatus): boolean {
  return status === PublicationStatus.DRAFT || status === PublicationStatus.IN_REVIEW;
}
