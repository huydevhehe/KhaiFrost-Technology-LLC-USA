import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { CustomersAdminController } from './controllers/customers-admin.controller';
import {
  CustomerAccountController,
  CustomerProfileController,
} from './controllers/customer-self.controller';
import { CustomerAccountService } from './services/customer-account.service';
import { CustomersAdminService } from './services/customers-admin.service';

@Module({
  imports: [UsersModule, AuditLogModule],
  controllers: [CustomersAdminController, CustomerProfileController, CustomerAccountController],
  providers: [CustomersAdminService, CustomerAccountService],
})
export class CustomersModule {}
