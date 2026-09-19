import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../enums/user-status.enum';

export const STAFF_ROLES = [Role.OWNER, Role.ADMIN, Role.STAFF] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const USER_SORT_FIELDS = ['createdAt', 'fullName', 'email', 'role', 'status', 'lastLoginAt'];

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
