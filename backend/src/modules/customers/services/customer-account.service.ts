import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { unauthorized } from '../../../common/exceptions/exception.factories';
import { authConfig } from '../../../config/auth.config';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { invalidPassword } from '../../auth/errors/auth-errors';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UsersService } from '../../users/services/users.service';
import { UpdateProfileDto } from '../dto/customer.dto';

@Injectable()
export class CustomerAccountService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLog: AuditLogService,
    @Inject(authConfig.KEY) private readonly auth: ConfigType<typeof authConfig>,
  ) {}

  async getProfile(userId: string): Promise<UserResponseDto> {
    return this.usersService.toResponse(await this.usersService.getById(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.usersService.updateOwnProfile(userId, dto);
    return this.usersService.toResponse(user);
  }

  // Anonymises the personal data, soft deletes the row and signs the person out everywhere
  async deleteAccount(userId: string, currentPassword: string): Promise<void> {
    const user = await this.usersService.findByIdWithPasswordHash(userId);
    if (!user) throw unauthorized();

    if (!(await this.usersService.verifyPassword(user, currentPassword))) {
      await this.usersService.recordFailedLogin(
        user.id,
        this.auth.loginMaxFailedAttempts,
        this.auth.loginLockMinutes,
      );
      throw invalidPassword();
    }
    // Recorded before anonymising so the trail keeps the name the person had
    await this.auditLog.record({
      action: 'customer.account-deleted',
      entityName: 'User',
      entityId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
    });
    await this.usersService.anonymiseAndDelete(userId);
  }
}
