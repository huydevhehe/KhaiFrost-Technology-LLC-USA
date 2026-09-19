import { User } from '../entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';

export function toUserResponse(
  user: User,
  avatarUrls: ReadonlyMap<string, string> = new Map(),
): UserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    avatarId: user.avatarId,
    avatarUrl: user.avatarId ? (avatarUrls.get(user.avatarId) ?? null) : null,
    preferredLocale: user.preferredLocale,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    version: user.version,
  };
}
