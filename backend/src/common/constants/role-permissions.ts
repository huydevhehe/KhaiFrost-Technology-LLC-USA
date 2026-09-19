import { Role } from '../enums/role.enum';
import { Permission } from './permissions';

const ALL_PERMISSIONS = Object.values(Permission);

const STAFF_PERMISSIONS: Permission[] = [
  Permission.POST_READ,
  Permission.POST_CREATE,
  Permission.POST_UPDATE_OWN,
  Permission.PRODUCT_READ,
  Permission.PRODUCT_CREATE,
  Permission.PRODUCT_UPDATE_OWN,
  Permission.PROJECT_READ,
  Permission.PROJECT_CREATE,
  Permission.PROJECT_UPDATE_OWN,
  Permission.SERVICE_READ,
  Permission.TESTIMONIAL_READ,
  Permission.TESTIMONIAL_CREATE,
  Permission.CLIENT_LOCATION_READ,
  Permission.PAGE_READ,
  Permission.UI_TRANSLATION_READ,
  Permission.SETTING_READ,
  Permission.SEO_READ,
  Permission.MEDIA_READ,
  Permission.MEDIA_UPLOAD,
  Permission.CUSTOMER_READ,
  Permission.CUSTOMER_CREATE,
  Permission.CONTACT_READ,
  Permission.CONTACT_UPDATE,
  Permission.DASHBOARD_READ,
  Permission.CONTENT_HEALTH_READ,
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [Role.OWNER]: new Set(ALL_PERMISSIONS),
  // Services must additionally stop admins from modifying owner accounts
  [Role.ADMIN]: new Set(ALL_PERMISSIONS.filter((p) => p !== Permission.AUDIT_LOG_EXPORT)),
  [Role.STAFF]: new Set(STAFF_PERMISSIONS),
  [Role.CUSTOMER]: new Set<Permission>(),
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
