import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { visibleBackOfficeRoles } from '../../../common/constants/owner-visibility';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Role } from '../../../common/enums/role.enum';
import { forbidden, notFound } from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { applyUserSearch } from '../utils/apply-user-search';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto, USER_SORT_FIELDS } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto, UserWithTemporaryPasswordDto } from '../dto/user-response.dto';
import { User } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';
import {
  assertCanAssignRole,
  assertCanCreateRole,
  assertCanManageTarget,
  creatableRoles,
  assertNotLastActiveOwner,
  assertNotSelf,
} from '../policies/user-management.policy';
import { generateTemporaryPassword } from './temporary-password';
import { UsersService } from './users.service';

type Actor = Pick<AuthenticatedUser, 'id' | 'role'>;

@Injectable()
export class StaffUsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly mediaReferences: MediaReferenceService,
  ) {}

  async list(
    actor: Actor,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    // Owners are invisible to everyone but owners, so their rows never reach a list or its totals
    const visible = visibleBackOfficeRoles(actor.role);
    const roles = query.role ? visible.filter((role) => role === query.role) : visible;
    const builder = this.users
      .createQueryBuilder('user')
      .where(roles.length ? 'user.role IN (:...roles)' : '1 = 0', { roles });
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.search) applyUserSearch(builder, query.search);
    const sort = resolveSort(query, USER_SORT_FIELDS, 'createdAt');
    builder.orderBy(`user.${sort.field}`, sort.order).addOrderBy('user.id', 'ASC');

    const page = await paginate(builder, query);
    const items = await this.usersService.toResponses(page.items);
    return new PaginatedResponseDto(items, page.meta);
  }

  async get(actor: Actor, id: string): Promise<UserResponseDto> {
    return this.usersService.toResponse(await this.getBackOfficeUser(actor, id));
  }

  async create(actor: Actor, dto: CreateUserDto): Promise<UserWithTemporaryPasswordDto> {
    const role = dto.role ?? creatableRoles(actor.role)[0];
    if (!role) throw forbidden(`A ${actor.role} cannot create back office accounts`);
    assertCanCreateRole(actor.role, role);
    const generated = dto.password ? undefined : generateTemporaryPassword();
    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      role,
      password: dto.password ?? (generated as string),
      mustChangePassword: generated !== undefined,
    });
    return { ...(await this.usersService.toResponse(user)), temporaryPassword: generated };
  }

  async update(actor: Actor, id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (dto.avatarId) await this.mediaReferences.assertAllExist([dto.avatarId]);
    let roleChanged = false;

    const saved = await this.dataSource.transaction(async (manager) => {
      const user = await this.lockBackOfficeUser(manager, actor, id);
      assertVersionMatches(user.version, dto.version);
      assertCanManageTarget(actor, user);

      if (dto.role !== undefined && dto.role !== user.role) {
        if (!roleHasPermission(actor.role, Permission.USER_ASSIGN_ROLE)) throw forbidden();
        assertNotSelf(actor.id, user.id, 'change the role of');
        assertCanAssignRole(actor.role, dto.role);
        if (user.role === Role.OWNER) {
          assertNotLastActiveOwner(user, await this.countActiveOwners(manager), 'demoted');
        }
        user.role = dto.role;
        roleChanged = true;
      }

      const email = dto.email;
      const phone = dto.phone === undefined ? undefined : this.usersService.requirePhone(dto.phone);
      const emailChanged = email !== undefined && email !== user.email;
      const phoneChanged = phone !== undefined && phone !== user.phone;
      if (emailChanged || phoneChanged) {
        await this.usersService.assertEmailAndPhoneAvailable({
          email: emailChanged ? email : undefined,
          phone: phoneChanged ? phone : undefined,
          excludeUserId: user.id,
        });
        if (emailChanged) user.email = email;
        if (phoneChanged) user.phone = phone;
      }
      if (dto.fullName !== undefined) user.fullName = dto.fullName;
      if (dto.avatarId !== undefined) {
        user.avatarId = dto.avatarId;
        user.avatar = undefined;
      }
      try {
        return await manager.getRepository(User).save(user);
      } catch (error) {
        throw this.usersService.translateUniqueViolation(error);
      }
    });

    if (roleChanged) await this.usersService.revokeSessions(id, 'role-changed');
    return this.usersService.toResponse(saved);
  }

  async lock(actor: Actor, id: string): Promise<UserResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const user = await this.lockBackOfficeUser(manager, actor, id);
      assertCanManageTarget(actor, user);
      assertNotSelf(actor.id, user.id, 'lock');
      if (user.role === Role.OWNER) {
        assertNotLastActiveOwner(user, await this.countActiveOwners(manager), 'locked');
      }
      await this.usersService.setStatus(id, UserStatus.LOCKED, manager);
    });
    await this.usersService.revokeSessions(id, 'account-locked');
    return this.usersService.toResponse(await this.getBackOfficeUser(actor, id));
  }

  async unlock(actor: Actor, id: string): Promise<UserResponseDto> {
    const user = await this.getBackOfficeUser(actor, id);
    assertCanManageTarget(actor, user);
    await this.usersService.setStatus(id, UserStatus.ACTIVE);
    return this.usersService.toResponse(await this.getBackOfficeUser(actor, id));
  }

  async resetPassword(actor: Actor, id: string): Promise<UserWithTemporaryPasswordDto> {
    const user = await this.getBackOfficeUser(actor, id);
    assertCanManageTarget(actor, user);
    assertNotSelf(actor.id, user.id, 'reset the password of');

    const temporaryPassword = generateTemporaryPassword();
    await this.usersService.setPassword(id, temporaryPassword, { mustChangePassword: true });
    await this.usersService.revokeSessions(id, 'password-reset-by-admin');
    return {
      ...(await this.usersService.toResponse(await this.getBackOfficeUser(actor, id))),
      temporaryPassword,
    };
  }

  async remove(actor: Actor, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await this.lockBackOfficeUser(manager, actor, id);
      assertCanManageTarget(actor, user);
      assertNotSelf(actor.id, user.id, 'delete');
      if (user.role === Role.OWNER) {
        assertNotLastActiveOwner(user, await this.countActiveOwners(manager), 'deleted');
      }
      await this.usersService.softDelete(id, manager);
    });
    await this.usersService.purgeCredentials(id, 'user-deleted');
  }

  private async getBackOfficeUser(actor: Actor, id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user || !visibleBackOfficeRoles(actor.role).includes(user.role)) throw notFound('User');
    return user;
  }

  // A target the actor may not even know about (an owner, for anyone but an owner) does not exist
  private async lockBackOfficeUser(
    manager: EntityManager,
    actor: Actor,
    id: string,
  ): Promise<User> {
    const user = await manager.getRepository(User).findOne({
      where: { id, role: In(visibleBackOfficeRoles(actor.role)) },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw notFound('User');
    return user;
  }

  // Locks every active owner row so two concurrent demotions cannot both succeed
  private async countActiveOwners(manager: EntityManager): Promise<number> {
    const owners = await manager.getRepository(User).find({
      select: { id: true },
      where: { role: Role.OWNER, status: UserStatus.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });
    return owners.length;
  }
}
