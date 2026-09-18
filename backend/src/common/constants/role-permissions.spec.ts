import { Role } from '../enums/role.enum';
import { Permission } from './permissions';
import { ROLE_PERMISSIONS, roleHasPermission } from './role-permissions';

describe('role permissions', () => {
  it('gives the owner every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(roleHasPermission(Role.OWNER, permission)).toBe(true);
    }
  });

  it('gives the admin everything except audit log export', () => {
    expect(roleHasPermission(Role.ADMIN, Permission.AUDIT_LOG_EXPORT)).toBe(false);
    expect(roleHasPermission(Role.ADMIN, Permission.AUDIT_LOG_READ)).toBe(true);
    expect(roleHasPermission(Role.ADMIN, Permission.USER_ASSIGN_ROLE)).toBe(true);
  });

  it('limits staff to own content and read access', () => {
    expect(roleHasPermission(Role.STAFF, Permission.POST_UPDATE_OWN)).toBe(true);
    expect(roleHasPermission(Role.STAFF, Permission.POST_UPDATE_ANY)).toBe(false);
    expect(roleHasPermission(Role.STAFF, Permission.POST_PUBLISH)).toBe(false);
    expect(roleHasPermission(Role.STAFF, Permission.USER_READ)).toBe(false);
    expect(roleHasPermission(Role.STAFF, Permission.MEDIA_UPLOAD)).toBe(true);
    expect(roleHasPermission(Role.STAFF, Permission.MEDIA_DELETE)).toBe(false);
  });

  it('gives customers nothing', () => {
    expect(ROLE_PERMISSIONS[Role.CUSTOMER].size).toBe(0);
  });

  it('uses resource:action string values', () => {
    for (const value of Object.values(Permission)) {
      expect(value).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });
});
