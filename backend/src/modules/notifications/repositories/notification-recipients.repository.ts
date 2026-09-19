import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';
import { User } from '../../users/entities/user.entity';

const STAFF_ROLES = [Role.OWNER, Role.ADMIN, Role.STAFF];

// Read-only lookup of the User table: who may act on an event
@Injectable()
export class NotificationRecipientsRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async findStaffIdsWithPermission(
    permission: Permission,
    excludedUserId: string | null = null,
  ): Promise<string[]> {
    const roles = STAFF_ROLES.filter((role) => roleHasPermission(role, permission));
    if (roles.length === 0) return [];
    const builder = this.users
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.role IN (:...roles)', { roles })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE });
    if (excludedUserId) builder.andWhere('user.id <> :excludedUserId', { excludedUserId });
    const rows = await builder.getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }
}
