// Shared admin building blocks. Import from "@/components/admin/shared".

export {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT_LABELS,
  type Locale,
  type MediaAccept,
  type MediaSelection,
  type PublicationStatus,
} from "./types";

export { formatBytes, formatDate, formatDateTime, formatDimensions, isFuture } from "./format";

export { ImageThumb, type ImageThumbProps } from "./ImageThumb";

export { Modal, type ModalProps } from "./Modal";

export {
  EmptyState,
  ErrorState,
  TableSkeleton,
  type EmptyStateProps,
  type ErrorStateProps,
  type TableSkeletonProps,
} from "./States";

export {
  MissingLocalesBadge,
  PublicationBadge,
  publicationStatusLabel,
  type MissingLocalesBadgeProps,
  type PublicationBadgeProps,
} from "./Badges";

export {
  LocaleTabs,
  TranslatedFields,
  missingLocales,
  toIncompleteMap,
  useLocaleTabs,
  type LocaleTabsProps,
  type TranslatedFieldsProps,
  type UseLocaleTabs,
} from "./LocaleTabs";

export {
  ToastProvider,
  useApiAction,
  useToast,
  type ApiAction,
  type ApiActionOptions,
  type ToastApi,
  type ToastItem,
  type ToastProviderProps,
  type ToastTone,
} from "./Toast";

export {
  ConfirmDialog,
  ConfirmProvider,
  useConfirm,
  type ConfirmDialogProps,
  type ConfirmOptions,
} from "./ConfirmDialog";

export {
  useApiList,
  useApiResource,
  useFilters,
  type UseApiListOptions,
  type UseApiListResult,
  type UseApiResourceOptions,
  type UseApiResourceResult,
} from "./useResource";

export {
  MediaBrowser,
  MediaMultiPicker,
  MediaPicker,
  toMediaSelection,
  type MediaBrowserProps,
  type MediaMultiPickerProps,
  type MediaPickerProps,
} from "./MediaPicker";

export { RichTextEditor, type RichTextEditorProps } from "./RichTextEditor";

export { isEmptyHtml, isSafeHref, isSafeSrc, sanitizeEditorHtml } from "./sanitizeHtml";
