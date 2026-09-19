import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../../common/constants/permissions';
import { RequestContextService } from '../../../common/context/request-context.service';
import { AllowPasswordChangePending } from '../../../common/decorators/allow-password-change-pending.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { SessionAuthenticator } from '../services/session-authenticator.service';
import { AccessControlGuard } from './access-control.guard';

class PlainController {
  open() {}

  @RequirePermissions(Permission.POST_PUBLISH)
  publish() {}

  @Roles(Role.OWNER, Role.ADMIN)
  ownersAndAdmins() {}

  @Roles(Role.CUSTOMER)
  customersOnly() {}

  @AllowPasswordChangePending()
  changePassword() {}
}

@Public()
class PublicController {
  @RequirePermissions(Permission.POST_PUBLISH)
  anything() {}
}

@AdminController('things')
class AdminAreaController {
  @RequirePermissions(Permission.POST_READ)
  read() {}

  @RequirePermissions(Permission.USER_CREATE, Permission.USER_ASSIGN_ROLE)
  createUser() {}
}

function user(
  role: Role,
  adminSessionActive = true,
  mustChangePassword = false,
): AuthenticatedUser {
  return { id: 'user-1', role, sessionId: 'session-1', adminSessionActive, mustChangePassword };
}

async function failureOf(promise: Promise<unknown>): Promise<ApplicationException> {
  try {
    await promise;
  } catch (error) {
    return error as ApplicationException;
  }
  throw new Error('expected the guard to reject');
}

describe('AccessControlGuard', () => {
  let authenticate: jest.Mock;
  let setUserId: jest.Mock;
  let guard: AccessControlGuard;

  function contextFor(
    controller: new () => object,
    method: string,
  ): { context: ExecutionContext; request: { user?: AuthenticatedUser } } {
    const request: { user?: AuthenticatedUser } = {};
    const handler = (controller.prototype as Record<string, () => void>)[method];
    const context = {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  beforeEach(() => {
    authenticate = jest.fn();
    setUserId = jest.fn();
    guard = new GuardFactory().create(authenticate, setUserId);
  });

  class GuardFactory {
    create(authenticateMock: jest.Mock, setUserIdMock: jest.Mock): AccessControlGuard {
      return new AccessControlGuard(
        new Reflector(),
        { authenticate: authenticateMock } as unknown as SessionAuthenticator,
        { setUserId: setUserIdMock } as unknown as RequestContextService,
      );
    }
  }

  it('ignores non http contexts', async () => {
    const context = { getType: () => 'rpc' } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('rejects anonymous callers on protected routes with 401', async () => {
    authenticate.mockResolvedValue(null);
    const { context } = contextFor(PlainController, 'open');
    const error = await failureOf(guard.canActivate(context));
    expect(error.getStatus()).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('lets any authenticated user through a route without rules and records the user', async () => {
    authenticate.mockResolvedValue(user(Role.CUSTOMER));
    const { context, request } = contextFor(PlainController, 'open');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.id).toBe('user-1');
    expect(setUserId).toHaveBeenCalledWith('user-1');
  });

  it('propagates authentication failures on protected routes', async () => {
    authenticate.mockRejectedValue(new Error('database down'));
    const { context } = contextFor(PlainController, 'open');
    await expect(guard.canActivate(context)).rejects.toThrow('database down');
  });

  describe('public routes', () => {
    it('allow anonymous callers without checking permissions', async () => {
      authenticate.mockResolvedValue(null);
      const { context, request } = contextFor(PublicController, 'anything');
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });

    it('still attach the user when a valid login is present', async () => {
      authenticate.mockResolvedValue(user(Role.CUSTOMER));
      const { context, request } = contextFor(PublicController, 'anything');
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user?.role).toBe(Role.CUSTOMER);
      expect(setUserId).toHaveBeenCalledWith('user-1');
    });

    it('never fail even when authentication throws', async () => {
      authenticate.mockRejectedValue(new Error('database down'));
      const { context, request } = contextFor(PublicController, 'anything');
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });
  });

  describe('admin area', () => {
    it('rejects customers with 403 before looking at the admin session', async () => {
      authenticate.mockResolvedValue(user(Role.CUSTOMER, true));
      const { context } = contextFor(AdminAreaController, 'read');
      const error = await failureOf(guard.canActivate(context));
      expect(error.code).toBe('FORBIDDEN');
    });

    it('blocks everything except password change while the password must be changed', async () => {
      authenticate.mockResolvedValue(user(Role.OWNER, true, true));
      const blocked = await failureOf(guard.canActivate(contextFor(AdminAreaController, 'read').context));
      expect(blocked.code).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(blocked.getStatus()).toBe(403);
      const open = await failureOf(guard.canActivate(contextFor(PlainController, 'open').context));
      expect(open.code).toBe('PASSWORD_CHANGE_REQUIRED');
      await expect(
        guard.canActivate(contextFor(PlainController, 'changePassword').context),
      ).resolves.toBe(true);
    });

    it('requires an elevated admin session even for the owner', async () => {
      authenticate.mockResolvedValue(user(Role.OWNER, false));
      const { context } = contextFor(AdminAreaController, 'read');
      const error = await failureOf(guard.canActivate(context));
      expect(error.code).toBe('ADMIN_SESSION_REQUIRED');
      expect(error.getStatus()).toBe(403);
    });

    it('admits staff with an admin session and the permission', async () => {
      authenticate.mockResolvedValue(user(Role.STAFF, true));
      const { context } = contextFor(AdminAreaController, 'read');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('rejects staff lacking the permission', async () => {
      authenticate.mockResolvedValue(user(Role.STAFF, true));
      const { context } = contextFor(AdminAreaController, 'createUser');
      expect((await failureOf(guard.canActivate(context))).code).toBe('FORBIDDEN');
    });

    it('requires every listed permission', async () => {
      authenticate.mockResolvedValue(user(Role.ADMIN, true));
      const { context } = contextFor(AdminAreaController, 'createUser');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('roles and permissions outside the admin area', () => {
    it('enforces @Roles', async () => {
      const { context } = contextFor(PlainController, 'ownersAndAdmins');
      authenticate.mockResolvedValue(user(Role.STAFF));
      expect((await failureOf(guard.canActivate(context))).code).toBe('FORBIDDEN');
      authenticate.mockResolvedValue(user(Role.ADMIN));
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('does not demand an admin session', async () => {
      authenticate.mockResolvedValue(user(Role.ADMIN, false));
      const { context } = contextFor(PlainController, 'ownersAndAdmins');
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('enforces @RequirePermissions through the role table', async () => {
      const { context } = contextFor(PlainController, 'publish');
      authenticate.mockResolvedValue(user(Role.STAFF));
      expect((await failureOf(guard.canActivate(context))).code).toBe('FORBIDDEN');
      authenticate.mockResolvedValue(user(Role.ADMIN));
      await expect(guard.canActivate(context)).resolves.toBe(true);
      authenticate.mockResolvedValue(user(Role.CUSTOMER));
      expect((await failureOf(guard.canActivate(context))).code).toBe('FORBIDDEN');
    });

    it('lets a customer-only route serve customers and reject staff', async () => {
      const { context } = contextFor(PlainController, 'customersOnly');
      authenticate.mockResolvedValue(user(Role.CUSTOMER));
      await expect(guard.canActivate(context)).resolves.toBe(true);
      authenticate.mockResolvedValue(user(Role.STAFF));
      expect((await failureOf(guard.canActivate(context))).code).toBe('FORBIDDEN');
    });
  });
});
