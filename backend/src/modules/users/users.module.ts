import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { StaffUsersController } from './controllers/staff-users.controller';
import { User } from './entities/user.entity';
import { PasswordHasher } from './services/password-hasher.service';
import { StaffUsersService } from './services/staff-users.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MediaModule],
  controllers: [StaffUsersController],
  providers: [UsersService, StaffUsersService, PasswordHasher],
  exports: [UsersService, PasswordHasher, TypeOrmModule],
})
export class UsersModule {}
