import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Role } from '../../../common/enums/role.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { applyUserSearch } from '../../users/utils/apply-user-search';
import { User } from '../../users/entities/user.entity';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UsersService } from '../../users/services/users.service';
import { generateTemporaryPassword } from '../../users/services/temporary-password';
import {
  CUSTOMER_SORT_FIELDS,
  CreateCustomerDto,
  CustomerResponseDto,
  CustomerWithTemporaryPasswordDto,
  ListCustomersQueryDto,
} from '../dto/customer.dto';
import { toCustomerResponse } from '../mappers/customer.mapper';

@Injectable()
export class CustomersAdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly usersService: UsersService,
  ) {}

  async list(query: ListCustomersQueryDto): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const builder = this.users
      .createQueryBuilder('user')
      .where('user.role = :role', { role: Role.CUSTOMER });
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.search) applyUserSearch(builder, query.search);
    const sort = resolveSort(query, CUSTOMER_SORT_FIELDS, 'createdAt');
    builder.orderBy(`user.${sort.field}`, sort.order).addOrderBy('user.id', 'ASC');

    const page = await paginate(builder, query);
    return new PaginatedResponseDto(await this.toResponses(page.items), page.meta);
  }

  async get(id: string): Promise<CustomerResponseDto> {
    return (await this.toResponses([await this.getCustomer(id)]))[0];
  }

  async create(dto: CreateCustomerDto): Promise<CustomerWithTemporaryPasswordDto> {
    const generated = dto.password ? undefined : generateTemporaryPassword();
    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      role: Role.CUSTOMER,
      password: dto.password ?? (generated as string),
      mustChangePassword: generated !== undefined,
    });
    const [customer] = await this.toResponses([user]);
    return { ...customer, temporaryPassword: generated };
  }

  async lock(id: string): Promise<CustomerResponseDto> {
    await this.getCustomer(id);
    await this.usersService.setStatus(id, UserStatus.LOCKED);
    await this.usersService.revokeSessions(id, 'account-locked');
    return this.get(id);
  }

  async unlock(id: string): Promise<CustomerResponseDto> {
    await this.getCustomer(id);
    await this.usersService.setStatus(id, UserStatus.ACTIVE);
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.getCustomer(id);
    await this.usersService.softDelete(id);
    await this.usersService.purgeCredentials(id, 'customer-deleted');
  }

  private async getCustomer(id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user || user.role !== Role.CUSTOMER) throw notFound('Customer');
    return user;
  }

  private async toResponses(users: User[]): Promise<CustomerResponseDto[]> {
    const profiles = await this.usersService.toResponses(users);
    return profiles.map(toCustomerResponse);
  }
}
