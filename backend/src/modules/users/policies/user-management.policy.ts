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

// Owner manages everyone in the back office, admin only staff, everyone else nobody
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === Role.OWNER) return isBackOfficeRole(targetRole);
  if (actorRole === Role.ADMIN) return targetRole === Role.STAFF;
  return false;
}

export function assertCanManageTarget(
  actor: PolicyActor,
  target: Pick<PolicyTarget, 'role'>,
): void {
  if (!canManageRole(actor.role, target.role)) {
    throw forbidden(`A ${actor.role} cannot manage a ${target.role} account`);
  }
}

export function assertCanAssignRole(actorRole: Role, newRole: Role): void {
  if (!canManageRole(actorRole, newRole)) {
    throw forbidden(`A ${actorRole} cannot assign the ${newRole} role`);
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
