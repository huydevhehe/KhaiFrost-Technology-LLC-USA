export enum Permission {
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LOCK = 'user:lock',
  USER_RESET_PASSWORD = 'user:reset-password',
  USER_ASSIGN_ROLE = 'user:assign-role',

  CUSTOMER_READ = 'customer:read',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_LOCK = 'customer:lock',
  CUSTOMER_DELETE = 'customer:delete',

  POST_READ = 'post:read',
  POST_CREATE = 'post:create',
  POST_UPDATE_OWN = 'post:update-own',
  POST_UPDATE_ANY = 'post:update-any',
  POST_PUBLISH = 'post:publish',
  POST_DELETE = 'post:delete',

  POST_CATEGORY_MANAGE = 'post-category:manage',

  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE_OWN = 'product:update-own',
  PRODUCT_UPDATE_ANY = 'product:update-any',
  PRODUCT_PUBLISH = 'product:publish',
  PRODUCT_DELETE = 'product:delete',

  PRODUCT_CATEGORY_MANAGE = 'product-category:manage',

  SERVICE_READ = 'service:read',
  SERVICE_CREATE = 'service:create',
  SERVICE_UPDATE = 'service:update',
  SERVICE_PUBLISH = 'service:publish',
  SERVICE_DELETE = 'service:delete',

  PROJECT_READ = 'project:read',
  PROJECT_CREATE = 'project:create',
  PROJECT_UPDATE_OWN = 'project:update-own',
  PROJECT_UPDATE_ANY = 'project:update-any',
  PROJECT_PUBLISH = 'project:publish',
  PROJECT_DELETE = 'project:delete',

  TESTIMONIAL_READ = 'testimonial:read',
  TESTIMONIAL_CREATE = 'testimonial:create',
  TESTIMONIAL_UPDATE = 'testimonial:update',
  TESTIMONIAL_DELETE = 'testimonial:delete',

  CLIENT_LOCATION_READ = 'client-location:read',
  CLIENT_LOCATION_CREATE = 'client-location:create',
  CLIENT_LOCATION_UPDATE = 'client-location:update',
  CLIENT_LOCATION_DELETE = 'client-location:delete',

  PAGE_READ = 'page:read',
  PAGE_UPDATE = 'page:update',
  PAGE_PUBLISH = 'page:publish',

  NAVIGATION_MANAGE = 'navigation:manage',

  UI_TRANSLATION_READ = 'ui-translation:read',
  UI_TRANSLATION_UPDATE = 'ui-translation:update',

  SETTING_READ = 'setting:read',
  SETTING_UPDATE = 'setting:update',

  SEO_READ = 'seo:read',
  SEO_UPDATE = 'seo:update',

  MEDIA_READ = 'media:read',
  MEDIA_UPLOAD = 'media:upload',
  MEDIA_DELETE = 'media:delete',

  CONTACT_READ = 'contact:read',
  CONTACT_UPDATE = 'contact:update',
  CONTACT_ASSIGN = 'contact:assign',
  CONTACT_DELETE = 'contact:delete',

  AUDIT_LOG_READ = 'audit-log:read',
  AUDIT_LOG_EXPORT = 'audit-log:export',

  DASHBOARD_READ = 'dashboard:read',

  CONTENT_HEALTH_READ = 'content-health:read',
}
