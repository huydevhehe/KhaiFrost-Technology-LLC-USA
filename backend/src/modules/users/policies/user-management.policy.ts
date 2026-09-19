import { Role } from '../../../common/enums/role.enum';
import { conflict, forbidden } from '../../../common/exceptions/exception.factories';
import { UserStatus } from '../enums/user-status.enum';

export const LAST_OWNER_ERROR_CODE = 'LAST_OWNER_PROTECTED';

export interface PolicyActor {
  id: string;
  role: Role;
}

export interface PolicyTarget {
  id: string;
  role: Role;
  status: UserStatus;
}

const BACK_OFFICE_ROLES: readonly Role[] = [Role.OWNER, Role.ADMIN, Role.STAFF];

export function isBackOfficeRole(role: Role): boolean {
  return BACK_OFFICE_ROLES.includes(role);
}

// Owner manages admins and staff (never another owner), admin only staff, everyone else nobody
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === Role.OWNER) return targetRole === Role.ADMIN || targetRole === Role.STAFF;
  if (actorRole === Role.ADMIN) return targetRole === Role.STAFF;
  return false;
}

// Back office roles each actor may create (the first one is the default): owner -> admin or
// staff, admin -> staff. Nobody can ever create an owner.
export function creatableRoles(actorRole: Role): readonly Role[] {
  if (actorRole === Role.OWNER) return [Role.ADMIN, Role.STAFF];
  if (actorRole === Role.ADMIN) return [Role.STAFF];
  return [];
}

export function assertCanManageTarget(
  actor: PolicyActor,
  target: Pick<PolicyTarget, 'role'>,
): void {
  if (!canManageRole(actor.role, target.role)) {
    throw forbidden(`A ${actor.role} cannot manage a ${target.role} account`);
  }
}

// Used when changing the role of an existing account
export function assertCanAssignRole(actorRole: Role, newRole: Role): void {
  if (!canManageRole(actorRole, newRole)) {
    throw forbidden(`A ${actorRole} cannot assign the ${newRole} role`);
  }
}

export function assertCanCreateRole(actorRole: Role, newRole: Role): void {
  if (!creatableRoles(actorRole).includes(newRole)) {
    throw forbidden(`A ${actorRole} cannot create a ${newRole} account`);
  }
}

export function assertNotSelf(actorId: string, targetId: string, action: string): void {
  if (actorId === targetId) throw forbidden(`You cannot ${action} your own account`);
}

export function assertNotLastActiveOwner(
  target: PolicyTarget,
  activeOwnerCount: number,
  action: string,
): void {
  const isActiveOwner = target.role === Role.OWNER && target.status === UserStatus.ACTIVE;
  if (isActiveOwner && activeOwnerCount <= 1) {
    throw conflict(LAST_OWNER_ERROR_CODE, `The last active owner cannot be ${action}`);
  }
}
