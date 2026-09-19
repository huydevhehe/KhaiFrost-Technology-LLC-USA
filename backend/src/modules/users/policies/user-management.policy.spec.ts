import { Role } from '../../../common/enums/role.enum';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { UserStatus } from '../enums/user-status.enum';
import {
  LAST_OWNER_ERROR_CODE,
  assertCanAssignRole,
  assertCanCreateRole,
  assertCanManageTarget,
  assertNotLastActiveOwner,
  assertNotSelf,
  canManageRole,
  creatableRoles,
} from './user-management.policy';

function catchError(action: () => void): ApplicationException {
  try {
    action();
  } catch (error) {
    return error as ApplicationException;
  }
  throw new Error('expected the action to throw');
}

describe('user management policy', () => {
  describe('canManageRole', () => {
    it('lets the owner manage admins and staff but never another owner', () => {
      expect(canManageRole(Role.OWNER, Role.ADMIN)).toBe(true);
      expect(canManageRole(Role.OWNER, Role.STAFF)).toBe(true);
      expect(canManageRole(Role.OWNER, Role.OWNER)).toBe(false);
    });

    it('lets an admin manage staff only', () => {
      expect(canManageRole(Role.ADMIN, Role.STAFF)).toBe(true);
      expect(canManageRole(Role.ADMIN, Role.ADMIN)).toBe(false);
      expect(canManageRole(Role.ADMIN, Role.OWNER)).toBe(false);
    });

    it('lets staff and customers manage nobody', () => {
      expect(canManageRole(Role.STAFF, Role.STAFF)).toBe(false);
      expect(canManageRole(Role.CUSTOMER, Role.STAFF)).toBe(false);
    });

    it('never treats customers as manageable back office accounts', () => {
      expect(canManageRole(Role.OWNER, Role.CUSTOMER)).toBe(false);
    });
  });

  it('assertCanManageTarget rejects an admin acting on an admin', () => {
    expect(() =>
      assertCanManageTarget({ id: 'a', role: Role.ADMIN }, { role: Role.STAFF }),
    ).not.toThrow();
    expect(
      catchError(() => assertCanManageTarget({ id: 'a', role: Role.ADMIN }, { role: Role.ADMIN }))
        .code,
    ).toBe('FORBIDDEN');
  });

  it('assertCanAssignRole stops an admin promoting anyone to admin or owner', () => {
    expect(() => assertCanAssignRole(Role.ADMIN, Role.STAFF)).not.toThrow();
    expect(() => assertCanAssignRole(Role.ADMIN, Role.ADMIN)).toThrow();
    expect(() => assertCanAssignRole(Role.ADMIN, Role.OWNER)).toThrow();
    expect(() => assertCanAssignRole(Role.OWNER, Role.ADMIN)).not.toThrow();
    expect(() => assertCanAssignRole(Role.OWNER, Role.STAFF)).not.toThrow();
  });

  it('nobody can assign the owner role', () => {
    for (const role of [Role.OWNER, Role.ADMIN, Role.STAFF, Role.CUSTOMER]) {
      expect(() => assertCanAssignRole(role, Role.OWNER)).toThrow();
      expect(() => assertCanCreateRole(role, Role.OWNER)).toThrow();
    }
  });

  describe('account creation', () => {
    it('lets the owner create admins and staff and admins create staff only', () => {
      expect(creatableRoles(Role.OWNER)).toEqual([Role.ADMIN, Role.STAFF]);
      expect(creatableRoles(Role.ADMIN)).toEqual([Role.STAFF]);
      expect(creatableRoles(Role.STAFF)).toEqual([]);
      expect(creatableRoles(Role.CUSTOMER)).toEqual([]);
      expect(() => assertCanCreateRole(Role.OWNER, Role.ADMIN)).not.toThrow();
      expect(() => assertCanCreateRole(Role.OWNER, Role.STAFF)).not.toThrow();
      expect(() => assertCanCreateRole(Role.ADMIN, Role.STAFF)).not.toThrow();
      expect(() => assertCanCreateRole(Role.ADMIN, Role.ADMIN)).toThrow();
      expect(() => assertCanCreateRole(Role.STAFF, Role.CUSTOMER)).toThrow();
    });
  });

  it('assertNotSelf rejects self targeting only', () => {
    expect(() => assertNotSelf('a', 'b', 'delete')).not.toThrow();
    expect(() => assertNotSelf('a', 'a', 'delete')).toThrow('You cannot delete your own account');
  });

  describe('assertNotLastActiveOwner', () => {
    const activeOwner = { id: 'o', role: Role.OWNER, status: UserStatus.ACTIVE };

    it('blocks the only active owner', () => {
      const error = catchError(() => assertNotLastActiveOwner(activeOwner, 1, 'deleted'));
      expect(error.code).toBe(LAST_OWNER_ERROR_CODE);
      expect(error.getStatus()).toBe(409);
    });

    it('allows an owner when another active owner exists', () => {
      expect(() => assertNotLastActiveOwner(activeOwner, 2, 'deleted')).not.toThrow();
    });

    it('ignores non owners and already locked owners', () => {
      expect(() =>
        assertNotLastActiveOwner(
          { id: 'x', role: Role.ADMIN, status: UserStatus.ACTIVE },
          1,
          'locked',
        ),
      ).not.toThrow();
      expect(() =>
        assertNotLastActiveOwner({ ...activeOwner, status: UserStatus.LOCKED }, 1, 'deleted'),
      ).not.toThrow();
    });
  });
});
