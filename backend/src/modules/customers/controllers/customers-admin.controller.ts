import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import {
  CreateCustomerDto,
  CustomerResponseDto,
  CustomerWithTemporaryPasswordDto,
  ListCustomersQueryDto,
} from '../dto/customer.dto';
import { CustomersAdminService } from '../services/customers-admin.service';

@AdminController('customers')
export class CustomersAdminController {
  constructor(private readonly customers: CustomersAdminService) {}

  @Get()
  @RequirePermissions(Permission.CUSTOMER_READ)
  @ApiOperation({ summary: 'List customers' })
  list(@Query() query: ListCustomersQueryDto): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    return this.customers.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get a customer' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customers.get(id);
  }

  @Post()
  @RequirePermissions(Permission.CUSTOMER_CREATE)
  @AuditAction('customer.created', 'User')
  @ApiOperation({ summary: 'Create a customer account (temporary password returned once)' })
  create(@Body() dto: CreateCustomerDto): Promise<CustomerWithTemporaryPasswordDto> {
    return this.customers.create(dto);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CUSTOMER_LOCK)
  @AuditAction('customer.locked', 'User')
  @ApiOperation({ summary: 'Lock a customer account' })
  lock(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customers.lock(id);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CUSTOMER_LOCK)
  @AuditAction('customer.unlocked', 'User')
  @ApiOperation({ summary: 'Unlock a customer account' })
  unlock(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customers.unlock(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CUSTOMER_DELETE)
  @AuditAction('customer.deleted', 'User')
  @ApiOperation({ summary: 'Soft delete a customer' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.customers.remove(id);
  }
}
