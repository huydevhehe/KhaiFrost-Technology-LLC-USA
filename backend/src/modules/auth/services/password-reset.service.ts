import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DomainEvent, PasswordResetRequestedEvent } from '../../../common/constants/domain-events';
import { authConfig } from '../../../config/auth.config';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { UserStatus } from '../../users/enums/user-status.enum';
import { assertPasswordPolicy } from '../../users/policies/password.policy';
import { PasswordHasher } from '../../users/services/password-hasher.service';
import { UsersService } from '../../users/services/users.service';
import {
  AuthAuditAction,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_MAX_ATTEMPTS,
} from '../constants/auth-constants';
import { ResetPasswordDto } from '../dto/auth-request.dto';
import { PasswordResetCode } from '../entities/password-reset-code.entity';
import { invalidResetCode } from '../errors/auth-errors';
import { AuthSessionService } from './auth-session.service';
import { TokenService } from './token.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetCode) private readonly codes: Repository<PasswordResetCode>,
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: AuthSessionService,
    private readonly tokens: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly events: EventEmitter2,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  // Always completes silently so callers cannot learn whether the email is registered
  async request(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.status !== UserStatus.ACTIVE) return;

    const existing = await this.codes.findOne({ where: { userId: user.id } });
    if (existing && Date.now() - existing.createdAt.getTime() < PASSWORD_RESET_COOLDOWN_MS) return;

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + this.config.passwordResetCodeTtlMinutes * 60_000);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(PasswordResetCode).delete({ userId: user.id });
      await manager.getRepository(PasswordResetCode).insert({
        userId: user.id,
        codeHash: this.tokens.hashResetCode(user.id, code),
        expiresAt,
        attempts: 0,
        usedAt: null,
      });
    });

    const event: PasswordResetRequestedEvent = {
      email: user.email,
      code,
      locale: user.preferredLocale,
      expiresAt,
    };
    this.events.emit(DomainEvent.PASSWORD_RESET_REQUESTED, event);
    await this.auditLog.record({
      action: AuthAuditAction.PASSWORD_RESET_REQUESTED,
      entityName: 'User',
      entityId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
    });
  }

  async reset(dto: ResetPasswordDto): Promise<void> {
    assertPasswordPolicy(dto.newPassword, { email: dto.identifier }, 'newPassword');

    const user = await this.users.findByEmail(dto.identifier);
    const record = user ? await this.codes.findOne({ where: { userId: user.id } }) : null;
    const usable =
      !!user &&
      !!record &&
      user.status === UserStatus.ACTIVE &&
      !record.usedAt &&
      record.expiresAt.getTime() > Date.now() &&
      record.attempts < PASSWORD_RESET_MAX_ATTEMPTS;
    if (!user || !record || !usable) {
      await this.passwordHasher.verifyAgainstDummy(dto.code);
      throw invalidResetCode();
    }

    if (!this.tokens.safeEqual(this.tokens.hashResetCode(user.id, dto.code), record.codeHash)) {
      await this.codes
        .createQueryBuilder()
        .update(PasswordResetCode)
        .set({ attempts: () => '"attempts" + 1' })
        .where('id = :id AND attempts < :max', { id: record.id, max: PASSWORD_RESET_MAX_ATTEMPTS })
        .execute();
      await this.auditLog.record({
        action: AuthAuditAction.PASSWORD_RESET_FAILED,
        entityName: 'User',
        entityId: user.id,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        metadata: { attempt: record.attempts + 1 },
      });
      throw invalidResetCode();
    }

    await this.dataSource.transaction(async (manager) => {
      const consumed = await manager
        .createQueryBuilder()
        .update(PasswordResetCode)
        .set({ usedAt: new Date() })
        .where('id = :id AND used_at IS NULL', { id: record.id })
        .execute();
      if (!consumed.affected) throw invalidResetCode();
      await this.users.setPassword(
        user.id,
        dto.newPassword,
        { mustChangePassword: false },
        manager,
      );
      await this.sessions.revokeAllForUser(user.id, 'password-reset', { manager });
    });

    await this.auditLog.record({
      action: AuthAuditAction.PASSWORD_RESET_COMPLETED,
      entityName: 'User',
      entityId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
    });
  }
}
