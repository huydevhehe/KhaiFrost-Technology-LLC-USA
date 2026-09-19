import { ROLE_PERMISSIONS } from '../../../common/constants/role-permissions';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { AuthUserResponseDto } from '../dto/auth-response.dto';

export function toAuthUser(
  user: UserResponseDto,
  adminSessionActive: boolean,
): AuthUserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    preferredLocale: user.preferredLocale,
    mustChangePassword: user.mustChangePassword,
    permissions: [...ROLE_PERMISSIONS[user.role]].sort(),
    adminSessionActive,
  };
}
