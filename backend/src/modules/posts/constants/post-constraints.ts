export const POST_SLUG_UNIQUE_INDEX = 'uq_posts_slug';
export const POST_CATEGORY_SLUG_UNIQUE_INDEX = 'uq_post_categories_slug';
export const POST_TRANSLATION_UNIQUE_INDEX = 'uq_post_translations_post_locale';
export const POST_CATEGORY_TRANSLATION_UNIQUE_INDEX = 'uq_post_category_translations_locale';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 200;
export const DEFAULT_AUTHOR_NAME = 'KhaiFrost';
export const REQUIRED_PUBLISH_FIELDS = ['title', 'excerpt', 'contentHtml'] as const;
export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
