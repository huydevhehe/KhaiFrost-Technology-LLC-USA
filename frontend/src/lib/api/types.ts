// Shared API types. Mirrors the backend contracts (envelope, pagination, roles, permissions).

export type Locale = "vi" | "en";

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  STAFF: "staff",
  CUSTOMER: "customer",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Mirrors backend/src/common/constants/permissions.ts */
export const PERMISSIONS = {
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_LOCK: "user:lock",
  USER_RESET_PASSWORD: "user:reset-password",
  USER_ASSIGN_ROLE: "user:assign-role",

  CUSTOMER_READ: "customer:read",
  CUSTOMER_UPDATE: "customer:update",
  CUSTOMER_LOCK: "customer:lock",
  CUSTOMER_DELETE: "customer:delete",

  POST_READ: "post:read",
  POST_CREATE: "post:create",
  POST_UPDATE_OWN: "post:update-own",
  POST_UPDATE_ANY: "post:update-any",
  POST_PUBLISH: "post:publish",
  POST_DELETE: "post:delete",

  POST_CATEGORY_MANAGE: "post-category:manage",

  PRODUCT_READ: "product:read",
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE_OWN: "product:update-own",
  PRODUCT_UPDATE_ANY: "product:update-any",
  PRODUCT_PUBLISH: "product:publish",
  PRODUCT_DELETE: "product:delete",

  PRODUCT_CATEGORY_MANAGE: "product-category:manage",

  SERVICE_READ: "service:read",
  SERVICE_CREATE: "service:create",
  SERVICE_UPDATE: "service:update",
  SERVICE_PUBLISH: "service:publish",
  SERVICE_DELETE: "service:delete",

  PROJECT_READ: "project:read",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE_OWN: "project:update-own",
  PROJECT_UPDATE_ANY: "project:update-any",
  PROJECT_PUBLISH: "project:publish",
  PROJECT_DELETE: "project:delete",

  TESTIMONIAL_READ: "testimonial:read",
  TESTIMONIAL_CREATE: "testimonial:create",
  TESTIMONIAL_UPDATE: "testimonial:update",
  TESTIMONIAL_DELETE: "testimonial:delete",

  CLIENT_LOCATION_READ: "client-location:read",
  CLIENT_LOCATION_CREATE: "client-location:create",
  CLIENT_LOCATION_UPDATE: "client-location:update",
  CLIENT_LOCATION_DELETE: "client-location:delete",

  PAGE_READ: "page:read",
  PAGE_UPDATE: "page:update",
  PAGE_PUBLISH: "page:publish",

  NAVIGATION_MANAGE: "navigation:manage",

  UI_TRANSLATION_READ: "ui-translation:read",
  UI_TRANSLATION_UPDATE: "ui-translation:update",

  SETTING_READ: "setting:read",
  SETTING_UPDATE: "setting:update",

  SEO_READ: "seo:read",
  SEO_UPDATE: "seo:update",

  MEDIA_READ: "media:read",
  MEDIA_UPLOAD: "media:upload",
  MEDIA_DELETE: "media:delete",

  CONTACT_READ: "contact:read",
  CONTACT_UPDATE: "contact:update",
  CONTACT_ASSIGN: "contact:assign",
  CONTACT_DELETE: "contact:delete",

  AUDIT_LOG_READ: "audit-log:read",
  AUDIT_LOG_EXPORT: "audit-log:export",

  DASHBOARD_READ: "dashboard:read",

  CONTENT_HEALTH_READ: "content-health:read",
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Pagination block the backend returns as `meta` on list endpoints. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export type Meta = PaginationMeta;

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Standard list query accepted by most admin list endpoints. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
  search?: string;
}

export interface ApiEnvelope<T, M = undefined> {
  data: T;
  meta?: M;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface FieldErrorDetail {
  field: string;
  messages: string[];
}

// ---- Auth ------------------------------------------------------------

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl: string | null;
  preferredLocale: Locale;
  mustChangePassword: boolean;
  permissions: Permission[];
  adminSessionActive: boolean;
}

export interface AuthSessionResult {
  user: AuthUser;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  rememberMe: boolean;
  current: boolean;
}

export interface AdminSessionStatus {
  active: boolean;
  expiresAt: string | null;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  preferredLocale?: Locale;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordInput {
  identifier: string;
  code: string;
  newPassword: string;
}

// ---- Account ---------------------------------------------------------

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  mustChangePassword: boolean;
  avatarId: string | null;
  avatarUrl: string | null;
  preferredLocale: Locale;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarId?: string | null;
  preferredLocale?: Locale;
}

export type Currency = "USD" | "VND";
export type BillingPeriod = "one_time" | "monthly" | "yearly";
export type ProductType = "source_code" | "hosting_plan" | "live_demo" | "other";

export interface ProductPrice {
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

export interface ProductCard {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  tagline: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  priceOnRequest: boolean;
  hasDemo: boolean;
  prices: ProductPrice[];
}

export interface FavoriteState {
  productId: string;
  favorited: boolean;
}

export type CartItemUnavailableReason =
  | "PRODUCT_REMOVED"
  | "PRODUCT_UNPUBLISHED"
  | "PRICE_ON_REQUEST"
  | "PRICE_REMOVED";

export interface CartItem {
  id: string;
  productId: string;
  product: ProductCard | null;
  quantity: number;
  allowsQuantity: boolean;
  billingPeriod: BillingPeriod;
  currency: Currency;
  snapshotUnitPrice: string;
  currentUnitPrice: string | null;
  priceChanged: boolean;
  unavailable: boolean;
  unavailableReason: CartItemUnavailableReason | null;
  unitPrice: string;
  lineTotal: string;
  addedAt: string;
}

export interface Cart {
  id: string | null;
  currency: Currency | null;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  total: string;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
}

export interface AddCartItemInput {
  productId: string;
  quantity?: number;
  currency?: Currency;
  billingPeriod?: BillingPeriod;
}

export interface CartMergeResult {
  cart: Cart;
  merged: { productId: string; billingPeriod: BillingPeriod; quantity: number }[];
  skipped: { productId: string; reason: string; message: string }[];
}

// ---- Admin shell -----------------------------------------------------

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityName: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListMeta extends PaginationMeta {
  unreadCount: number;
}

export type AdminSearchType =
  | "posts"
  | "products"
  | "projects"
  | "services"
  | "testimonials"
  | "contacts"
  | "users"
  | "customers"
  | "pages"
  | "media";

export interface AdminSearchResult {
  type: AdminSearchType;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
}
