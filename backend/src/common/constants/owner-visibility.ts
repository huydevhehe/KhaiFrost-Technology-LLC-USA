import { Role } from '../enums/role.enum';

// Owners are invisible to everyone except other owners. Wherever an owner would still have to
// appear (audit trail, activity feed) non owners see this neutral label instead.
export const OWNER_DISPLAY_LABEL = 'Quản trị viên.';

export function canSeeOwners(viewerRole: Role | null | undefined): boolean {
  return viewerRole === Role.OWNER;
}

// Back office roles a viewer is allowed to know about
export function visibleBackOfficeRoles(viewerRole: Role | null | undefined): Role[] {
  return canSeeOwners(viewerRole) ? [Role.OWNER, Role.ADMIN, Role.STAFF] : [Role.ADMIN, Role.STAFF];
}
