import { UserResponseDto } from '../../users/dto/user-response.dto';
import { CustomerResponseDto } from '../dto/customer.dto';

export function toCustomerResponse(user: UserResponseDto): CustomerResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    avatarUrl: user.avatarUrl,
    preferredLocale: user.preferredLocale,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    version: user.version,
  };
}
