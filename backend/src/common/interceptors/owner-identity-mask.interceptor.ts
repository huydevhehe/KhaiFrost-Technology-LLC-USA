import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { mergeMap, Observable } from 'rxjs';
import { User } from '../../modules/users/entities/user.entity';
import { canSeeOwners } from '../constants/owner-visibility';
import { ADMIN_AREA_KEY } from '../decorators/admin-controller.decorator';
import { Role } from '../enums/role.enum';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

const ID_REFERENCE_KEY = /.Id$/;

function isTraversable(value: object): boolean {
  return !(value instanceof Date || Buffer.isBuffer(value) || 'pipe' in value);
}

// Nulls every "...Id" reference (createdById, assignedToId, authorId, ...) that points at an owner
export function maskOwnerReferences(
  value: unknown,
  ownerIds: ReadonlySet<string>,
  seen = new WeakSet<object>(),
): void {
  if (typeof value !== 'object' || value === null || seen.has(value) || !isTraversable(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) maskOwnerReferences(item, ownerIds, seen);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const child = record[key];
    if (typeof child === 'string') {
      if (ID_REFERENCE_KEY.test(key) && ownerIds.has(child)) record[key] = null;
    } else {
      maskOwnerReferences(child, ownerIds, seen);
    }
  }
}

// One place that hides owner identifiers embedded in any admin response for non owner viewers
@Injectable()
export class OwnerIdentityMaskInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const isAdminArea = this.reflector.getAllAndOverride<boolean | undefined>(ADMIN_AREA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const viewerRole: Role | undefined = context.switchToHttp().getRequest<AuthenticatedRequest>()
      .user?.role;
    if (!isAdminArea || canSeeOwners(viewerRole) || !this.dataSource.hasMetadata(User)) {
      return next.handle();
    }
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        if (typeof result !== 'object' || result === null) return result;
        const owners = await this.dataSource.getRepository(User).find({
          select: { id: true },
          where: { role: Role.OWNER },
          withDeleted: true,
        });
        maskOwnerReferences(result, new Set(owners.map((owner) => owner.id)));
        return result;
      }),
    );
  }
}
