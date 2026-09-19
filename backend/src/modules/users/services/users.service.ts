import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';
import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { normalizePhone } from '../../../common/utils/normalize-phone';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { USER_EMAIL_UNIQUE_INDEX, USER_PHONE_UNIQUE_INDEX, User } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';
import {
  CredentialsPurgeRequestedPayload,
  SessionsRevokeRequestedPayload,
  UserCreatedPayload,
  UserEvent,
} from '../events/user-events';
import { toUserResponse } from '../mappers/user.mapper';
import { assertPasswordPolicy } from '../policies/password.policy';
import { PasswordHasher } from './password-hasher.service';

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  mustChangePassword?: boolean;
  preferredLocale?: Locale;
  avatarId?: string | null;
}

export interface UpdateOwnProfileInput {
  fullName?: string;
  phone?: string;
  avatarId?: string | null;
  preferredLocale?: Locale;
}

export interface UserIdentifier {
  kind: 'email' | 'phone';
  value: string;
}

// Bookkeeping updates (login counters, hash upgrades) must not invalidate an admin's optimistic lock
const KEEP_VERSION = () => '"version"';

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// An identifier containing "@" is an email, anything else is treated as a phone number
export function parseIdentifier(raw: string): UserIdentifier | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  if (raw.includes('@')) return { kind: 'email', value: normalizeEmail(raw) };
  const phone = normalizePhone(raw);
  return phone ? { kind: 'phone', value: phone } : null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly passwordHasher: PasswordHasher,
    private readonly mediaReferences: MediaReferenceService,
    private readonly events: EventEmitter2,
  ) {}

  findById(id: string, manager?: EntityManager): Promise<User | null> {
    return (manager?.getRepository(User) ?? this.users).findOne({ where: { id } });
  }

  async getById(id: string, manager?: EntityManager): Promise<User> {
    const user = await this.findById(id, manager);
    if (!user) throw notFound('User');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: normalizeEmail(email) } });
  }

  // Includes the password hash; use only where a password is verified
  findByIdWithPasswordHash(id: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  findByIdentifierWithPasswordHash(identifier: UserIdentifier): Promise<User | null> {
    const column = identifier.kind === 'email' ? 'email' : 'phone';
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where(`user.${column} = :value`, { value: identifier.value })
      .getOne();
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);
    const phone = this.requirePhone(input.phone);
    assertPasswordPolicy(input.password, { email });
    if (input.avatarId) await this.mediaReferences.assertAllExist([input.avatarId]);
    await this.assertEmailAndPhoneAvailable({ email, phone });

    const passwordHash = await this.passwordHasher.hash(input.password);
    let saved: User;
    try {
      saved = await this.users.save(
        this.users.create({
          fullName: input.fullName.trim(),
          email,
          phone,
          passwordHash,
          role: input.role,
          status: UserStatus.ACTIVE,
          mustChangePassword: input.mustChangePassword ?? false,
          preferredLocale: input.preferredLocale ?? Locale.VI,
          avatarId: input.avatarId ?? null,
        }),
      );
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
    const payload: UserCreatedPayload = { userId: saved.id };
    await this.events.emitAsync(UserEvent.CREATED, payload);
    return saved;
  }

  async updateOwnProfile(userId: string, input: UpdateOwnProfileInput): Promise<User> {
    const user = await this.getById(userId);
    if (input.phone !== undefined) {
      const phone = this.requirePhone(input.phone);
      if (phone !== user.phone) {
        await this.assertEmailAndPhoneAvailable({ phone, excludeUserId: userId });
        user.phone = phone;
      }
    }
    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    if (input.preferredLocale !== undefined) user.preferredLocale = input.preferredLocale;
    if (input.avatarId !== undefined) {
      if (input.avatarId) await this.mediaReferences.assertAllExist([input.avatarId]);
      user.avatarId = input.avatarId;
      user.avatar = undefined;
    }
    try {
      return await this.users.save(user);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async setPassword(
    userId: string,
    plainPassword: string,
    options: { mustChangePassword: boolean },
    manager?: EntityManager,
  ): Promise<void> {
    const user = await this.getById(userId, manager);
    assertPasswordPolicy(plainPassword, { email: user.email });
    const passwordHash = await this.passwordHasher.hash(plainPassword);
    await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(User)
      .set({
        passwordHash,
        mustChangePassword: options.mustChangePassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
        version: KEEP_VERSION,
      })
      .where('id = :userId', { userId })
      .execute();
  }

  async upgradePasswordHash(userId: string, plainPassword: string): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(plainPassword);
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({ passwordHash, version: KEEP_VERSION })
      .where('id = :userId', { userId })
      .execute();
  }

  // Atomic counter; reports whether this failure tripped the temporary lock
  async recordFailedLogin(
    userId: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<{ attempts: number; locked: boolean }> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ failedLoginAttempts: () => '"failed_login_attempts" + 1', version: KEEP_VERSION })
      .where('id = :userId', { userId })
      .returning('failed_login_attempts')
      .execute();
    const rows = result.raw as { failed_login_attempts?: number }[];
    const attempts = Number(rows[0]?.failed_login_attempts ?? 0);
    if (attempts < maxAttempts) return { attempts, locked: false };

    await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() + lockMinutes * 60_000),
        version: KEEP_VERSION,
      })
      .where('id = :userId', { userId })
      .execute();
    return { attempts, locked: true };
  }

  async recordSuccessfulLogin(userId: string, options: { touchLastLogin: boolean }): Promise<void> {
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        version: KEEP_VERSION,
        ...(options.touchLastLogin && { lastLoginAt: new Date() }),
      })
      .where('id = :userId', { userId })
      .execute();
  }

  async setStatus(userId: string, status: UserStatus, manager?: EntityManager): Promise<void> {
    await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(User)
      .set({
        status,
        ...(status === UserStatus.ACTIVE && { failedLoginAttempts: 0, lockedUntil: null }),
      })
      .where('id = :userId', { userId })
      .execute();
  }

  // Keeps the row for referential history but removes everything that identifies the person
  async anonymiseAndDelete(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          fullName: 'Deleted user',
          email: `deleted-${userId}@invalid.local`,
          phone: `deleted-${userId.slice(0, 8)}`,
          passwordHash: this.passwordHasher.unusableHash(),
          avatarId: null,
          mustChangePassword: false,
          status: UserStatus.LOCKED,
        })
        .where('id = :userId', { userId })
        .execute();
      await manager.getRepository(User).softDelete({ id: userId });
    });
    await this.purgeCredentials(userId, 'account-deleted');
  }

  async softDelete(userId: string, manager?: EntityManager): Promise<void> {
    await (manager ?? this.dataSource.manager).getRepository(User).softDelete({ id: userId });
  }

  async revokeSessions(userId: string, reason: string): Promise<void> {
    const payload: SessionsRevokeRequestedPayload = { userId, reason };
    await this.events.emitAsync(UserEvent.SESSIONS_REVOKE_REQUESTED, payload);
  }

  async purgeCredentials(userId: string, reason: string): Promise<void> {
    const payload: CredentialsPurgeRequestedPayload = { userId, reason };
    await this.events.emitAsync(UserEvent.CREDENTIALS_PURGE_REQUESTED, payload);
  }

  verifyPassword(user: Pick<User, 'passwordHash'>, plain: string): Promise<boolean> {
    return this.passwordHasher.verify(user.passwordHash, plain);
  }

  async toResponse(user: User): Promise<UserResponseDto> {
    return (await this.toResponses([user]))[0];
  }

  async toResponses(users: User[]): Promise<UserResponseDto[]> {
    const avatarIds = users.map((user) => user.avatarId).filter((id): id is string => !!id);
    const urls = await this.mediaReferences.resolveUrls(avatarIds);
    return users.map((user) => toUserResponse(user, urls));
  }

  requirePhone(raw: string): string {
    const phone = normalizePhone(raw);
    if (!phone) {
      throw validationFailed([
        { field: 'phone', messages: ['phone must be a valid phone number'] },
      ]);
    }
    return phone;
  }

  async assertEmailAndPhoneAvailable(input: {
    email?: string;
    phone?: string;
    excludeUserId?: string;
  }): Promise<void> {
    const conditions: string[] = [];
    if (input.email) conditions.push('user.email = :email');
    if (input.phone) conditions.push('user.phone = :phone');
    if (conditions.length === 0) return;

    const builder = this.users
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.phone'])
      .where(`(${conditions.join(' OR ')})`, { email: input.email, phone: input.phone });
    if (input.excludeUserId) {
      builder.andWhere('user.id <> :excludeUserId', { excludeUserId: input.excludeUserId });
    }

    const clashes = new Set<string>();
    for (const existing of await builder.getMany()) {
      if (input.email && existing.email === input.email) clashes.add('email');
      if (input.phone && existing.phone === input.phone) clashes.add('phone');
    }
    if (clashes.size > 0) throw this.clashError([...clashes]);
  }

  translateUniqueViolation(error: unknown): unknown {
    if (isUniqueViolation(error, USER_EMAIL_UNIQUE_INDEX)) return this.clashError(['email']);
    if (isUniqueViolation(error, USER_PHONE_UNIQUE_INDEX)) return this.clashError(['phone']);
    return error;
  }

  private clashError(fields: string[]) {
    return conflict(
      ErrorCode.CONFLICT,
      'A user with the same unique value already exists',
      fields.map((field) => ({ field, messages: [`${field} is already in use`] })),
    );
  }
}
