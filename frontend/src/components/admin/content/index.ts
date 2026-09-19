// Building blocks shared by the content admin screens (bài viết, sản phẩm, dự án,
// cảm nhận khách hàng, bản đồ khách hàng).

export { slugify, validateSlug, SLUG_PATTERN } from "./slug";

export {
  contentFieldErrors,
  describeContentError,
  describeField,
  describeMissingTranslations,
  isVersionConflict,
  missingTranslationItems,
  type MissingTranslationItem,
} from "./errors";

export { TagInput, type TagInputProps } from "./TagInput";
export { KeyValueEditor, type FlatMap, type KeyValueEditorProps } from "./KeyValueEditor";
export { SeoFieldset, EMPTY_SEO, type SeoValues, type SeoFieldsetProps } from "./SeoFieldset";
export { ActionButton, RowIconButton, type ActionButtonProps } from "./Buttons";
export { Pager, type PagerProps } from "./Pager";
export {
  ConflictNotice,
  InfoNotice,
  MissingTranslationNotice,
  type ConflictNoticeProps,
} from "./Notices";
export { useLeaveGuard, useUnsavedChanges, type LeaveGuard } from "./useUnsavedChanges";
export {
  fromLocalInputValue,
  isScheduled,
  toDateInputValue,
  toLocalInputValue,
} from "./datetime";
