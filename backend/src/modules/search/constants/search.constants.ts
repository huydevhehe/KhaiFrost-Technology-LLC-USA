import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Permission } from '../../../common/constants/permissions';

export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const ADMIN_SEARCH_DEFAULT_LIMIT = 5;
export const ADMIN_SEARCH_MAX_LIMIT = 10;
export const PUBLIC_SEARCH_LIMIT_PER_TYPE = 8;

const ONE_MINUTE_MS = 60_000;

// Staff type-ahead: generous but bounded per IP
export const ThrottleAdminSearch = () =>
  applyDecorators(Throttle({ default: { limit: 60, ttl: ONE_MINUTE_MS } }));

// Anonymous search box: tighter than admin because nobody is authenticated
export const ThrottlePublicSearch = () =>
  applyDecorators(Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } }));

export enum AdminSearchType {
  POSTS = 'posts',
  PRODUCTS = 'products',
  PROJECTS = 'projects',
  SERVICES = 'services',
  TESTIMONIALS = 'testimonials',
  CONTACTS = 'contacts',
  USERS = 'users',
  CUSTOMERS = 'customers',
  PAGES = 'pages',
  MEDIA = 'media',
}

export const ADMIN_SEARCH_TYPES: readonly AdminSearchType[] = Object.values(AdminSearchType);

export const ADMIN_SEARCH_PERMISSION: Record<AdminSearchType, Permission> = {
  [AdminSearchType.POSTS]: Permission.POST_READ,
  [AdminSearchType.PRODUCTS]: Permission.PRODUCT_READ,
  [AdminSearchType.PROJECTS]: Permission.PROJECT_READ,
  [AdminSearchType.SERVICES]: Permission.SERVICE_READ,
  [AdminSearchType.TESTIMONIALS]: Permission.TESTIMONIAL_READ,
  [AdminSearchType.CONTACTS]: Permission.CONTACT_READ,
  [AdminSearchType.USERS]: Permission.USER_READ,
  [AdminSearchType.CUSTOMERS]: Permission.CUSTOMER_READ,
  [AdminSearchType.PAGES]: Permission.PAGE_READ,
  [AdminSearchType.MEDIA]: Permission.MEDIA_READ,
};

// Admin frontend routes, one detail screen per type
export const ADMIN_SEARCH_ROUTE: Record<AdminSearchType, string> = {
  [AdminSearchType.POSTS]: '/admin/blog',
  [AdminSearchType.PRODUCTS]: '/admin/products',
  [AdminSearchType.PROJECTS]: '/admin/projects',
  [AdminSearchType.SERVICES]: '/admin/services',
  [AdminSearchType.TESTIMONIALS]: '/admin/testimonials',
  [AdminSearchType.CONTACTS]: '/admin/contacts',
  [AdminSearchType.USERS]: '/admin/users',
  [AdminSearchType.CUSTOMERS]: '/admin/customers',
  [AdminSearchType.PAGES]: '/admin/pages',
  [AdminSearchType.MEDIA]: '/admin/media',
};

export enum PublicSearchType {
  POST = 'post',
  PRODUCT = 'product',
  PROJECT = 'project',
  SERVICE = 'service',
}

export const PUBLIC_SEARCH_PATH_PREFIX: Record<PublicSearchType, string> = {
  [PublicSearchType.POST]: '/bai-viet',
  [PublicSearchType.PRODUCT]: '/san-pham',
  [PublicSearchType.PROJECT]: '/du-an',
  [PublicSearchType.SERVICE]: '/dich-vu',
};
