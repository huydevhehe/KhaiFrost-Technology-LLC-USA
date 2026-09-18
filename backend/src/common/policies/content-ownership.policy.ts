import { Permission } from '../constants/permissions';
import { roleHasPermission } from '../constants/role-permissions';
import { forbidden } from '../exceptions/exception.factories';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export function assertCanModifyContent(
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  ownerId: string | null | undefined,
  ownPermission: Permission,
  anyPermission: Permission,
): void {
  if (roleHasPermission(user.role, anyPermission)) return;
  if (roleHasPermission(user.role, ownPermission) && ownerId && ownerId === user.id) return;
  throw forbidden('You can only modify content you created');
}
