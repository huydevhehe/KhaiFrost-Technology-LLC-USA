import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { RequestContextService } from '../../../common/context/request-context.service';
import { ALLOW_PASSWORD_CHANGE_PENDING_KEY } from '../../../common/decorators/allow-password-change-pending.decorator';
import { ADMIN_AREA_KEY } from '../../../common/decorators/admin-controller.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import {
  adminSessionRequired,
  forbidden,
  passwordChangeRequired,
  unauthorized,
} from '../../../common/exceptions/exception.factories';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { SessionAuthenticator } from '../services/session-authenticator.service';

// The single global guard: authentication, admin area elevation, roles, then permissions
@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticator: SessionAuthenticator,
    private readonly requestContext: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) === true;

    // Public routes still get request.user when a valid login is present, but can never fail here
    let user: AuthenticatedUser | null;
    try {
      user = await this.authenticator.authenticate(request, response);
    } catch (error) {
      if (!isPublic) throw error;
      user = null;
    }
    if (user) {
      request.user = user;
      this.requestContext.setUserId(user.id);
    }
    if (isPublic) return true;
    if (!user) throw unauthorized();

    // A bootstrap or temporary password must be replaced before anything else is allowed
    if (
      user.mustChangePassword &&
      this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_PENDING_KEY, targets) !== true
    ) {
      throw passwordChangeRequired();
    }

    if (this.reflector.getAllAndOverride<boolean>(ADMIN_AREA_KEY, targets) === true) {
      if (user.role === Role.CUSTOMER) throw forbidden();
      if (!user.adminSessionActive) throw adminSessionRequired();
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles && roles.length > 0 && !roles.includes(user.role)) throw forbidden();

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
