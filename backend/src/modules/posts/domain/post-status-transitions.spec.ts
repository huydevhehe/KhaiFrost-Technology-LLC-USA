import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import {
  canTransition,
  isEditableWithoutUpdateAny,
  PostWorkflowAction,
  resolveTransition,
} from './post-status-transitions';

const { DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED } = PublicationStatus;

describe('post status transitions', () => {
  const allowed: [PostWorkflowAction, PublicationStatus, PublicationStatus][] = [
    [PostWorkflowAction.SUBMIT_FOR_REVIEW, DRAFT, IN_REVIEW],
    [PostWorkflowAction.PUBLISH, DRAFT, PUBLISHED],
    [PostWorkflowAction.PUBLISH, IN_REVIEW, PUBLISHED],
    [PostWorkflowAction.UNPUBLISH, PUBLISHED, DRAFT],
    [PostWorkflowAction.ARCHIVE, DRAFT, ARCHIVED],
    [PostWorkflowAction.ARCHIVE, IN_REVIEW, ARCHIVED],
    [PostWorkflowAction.ARCHIVE, PUBLISHED, ARCHIVED],
    [PostWorkflowAction.RESTORE, ARCHIVED, DRAFT],
  ];

  it.each(allowed)('%s: %s -> %s is allowed', (action, from, to) => {
    expect(canTransition(action, from)).toBe(true);
    expect(resolveTransition(action, from)).toBe(to);
  });

  const forbidden: [PostWorkflowAction, PublicationStatus][] = [
    [PostWorkflowAction.SUBMIT_FOR_REVIEW, IN_REVIEW],
    [PostWorkflowAction.SUBMIT_FOR_REVIEW, PUBLISHED],
    [PostWorkflowAction.SUBMIT_FOR_REVIEW, ARCHIVED],
    [PostWorkflowAction.PUBLISH, PUBLISHED],
    [PostWorkflowAction.PUBLISH, ARCHIVED],
    [PostWorkflowAction.UNPUBLISH, DRAFT],
    [PostWorkflowAction.UNPUBLISH, IN_REVIEW],
    [PostWorkflowAction.UNPUBLISH, ARCHIVED],
    [PostWorkflowAction.ARCHIVE, ARCHIVED],
    [PostWorkflowAction.RESTORE, DRAFT],
    [PostWorkflowAction.RESTORE, IN_REVIEW],
    [PostWorkflowAction.RESTORE, PUBLISHED],
  ];

  it.each(forbidden)('%s from %s is rejected with a 409', (action, from) => {
    expect(canTransition(action, from)).toBe(false);
    try {
      resolveTransition(action, from);
      throw new Error('expected a rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationException);
      expect((error as ApplicationException).code).toBe('INVALID_STATUS_TRANSITION');
      expect((error as ApplicationException).getStatus()).toBe(409);
    }
  });

  it('covers every status/action pair exactly once', () => {
    const actions = Object.values(PostWorkflowAction);
    const statuses = Object.values(PublicationStatus);
    expect(allowed.length + forbidden.length).toBe(actions.length * statuses.length);
  });

  it('lets staff edit only draft and in_review posts', () => {
    expect(isEditableWithoutUpdateAny(DRAFT)).toBe(true);
    expect(isEditableWithoutUpdateAny(IN_REVIEW)).toBe(true);
    expect(isEditableWithoutUpdateAny(PUBLISHED)).toBe(false);
    expect(isEditableWithoutUpdateAny(ARCHIVED)).toBe(false);
  });
});
