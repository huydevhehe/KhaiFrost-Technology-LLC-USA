import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestContextService } from '../../src/common/context/request-context.service';
import { roleHasPermission } from '../../src/common/constants/role-permissions';
import { Permission } from '../../src/common/constants/permissions';
import { ADMIN_AREA_KEY } from '../../src/common/decorators/admin-controller.decorator';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../src/common/decorators/require-permissions.decorator';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';
import { Role } from '../../src/common/enums/role.enum';
import {
  adminSessionRequired,
  forbidden,
  unauthorized,
} from '../../src/common/exceptions/exception.factories';
import { AuthenticatedRequest } from '../../src/common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '../../src/common/interfaces/authenticated-user.interface';

export const TEST_USER_HEADER = 'x-test-user';

export type TestUser = Pick<AuthenticatedUser, 'id' | 'role'> &
  Partial<Pick<AuthenticatedUser, 'sessionId' | 'adminSessionActive'>>;

// Header to pass to supertest: request(server).get(url).set(asTestUser({ id, role: Role.STAFF }))
export function asTestUser(user: TestUser): Record<string, string> {
  return { [TEST_USER_HEADER]: JSON.stringify(user) };
}

// Stands in for the real auth guards in module-level tests: same metadata rules, no JWT/cookies
@Injectable()
export class TestAuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const targets = [context.getHandler(), context.getClass()];

    const rawUser = request.headers[TEST_USER_HEADER];
    if (typeof rawUser === 'string') {
      const parsed = JSON.parse(rawUser) as TestUser;
      request.user = { sessionId: 'test-session', adminSessionActive: true, ...parsed };
      this.requestContext.setUserId(parsed.id);
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const user = request.user;
    if (!user) throw unauthorized();

    if (this.reflector.getAllAndOverride<boolean>(ADMIN_AREA_KEY, targets)) {
      if (user.role === Role.CUSTOMER) throw forbidden();
      if (!user.adminSessionActive) throw adminSessionRequired();
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(user.role)) throw forbidden();

    const permissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      targets,
    );
    if (permissions?.some((permission) => !roleHasPermission(user.role, permission))) {
      throw forbidden();
    }
    return true;
  }
}
