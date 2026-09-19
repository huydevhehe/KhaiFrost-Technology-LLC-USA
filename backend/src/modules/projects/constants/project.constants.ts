export const PROJECT_SLUG_UNIQUE_INDEX = 'uq_projects_slug_active';
export const PROJECT_CATEGORY_SLUG_UNIQUE_INDEX = 'uq_project_categories_slug_active';
export const RESERVED_PROJECT_SLUGS: readonly string[] = ['slugs', 'categories', 'reorder'];
export const INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION';
// Local until common/constants/domain-events.ts gets a project entry
export const PROJECT_SUBMITTED_FOR_REVIEW_EVENT = 'project.submitted-for-review';
export interface ProjectSubmittedForReviewEvent {
  projectId: string;
  title: string;
  authorId: string | null;
}
export const DURATION_LABEL_PATTERN = /^\d{1,3}:[0-5]\d$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
