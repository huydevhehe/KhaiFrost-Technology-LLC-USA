export const SERVICE_ICON_KEYS = ['ai', 'cloud', 'security', 'code'] as const;

export const CATEGORY_ICON_KEYS = [
  'rocket',
  'trendingUp',
  'clock',
  'users',
  'search',
  'lightbulb',
  'settings',
  'lineChart',
  'briefcase',
  'bolt',
  'shield',
  'headset',
  'eye',
  'target',
  'calendar',
  'globe',
  'heart',
] as const;

// Route segments that would collide with the slug route
export const RESERVED_SERVICE_SLUGS: readonly string[] = ['overview', 'slugs', 'reorder'];

export const SERVICE_SLUG_UNIQUE_INDEX = 'uq_service_categories_slug_active';

export const DURATION_LABEL_PATTERN = /^\d{1,3}:[0-5]\d$/;

export const INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION';
