import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config';
import { buildDataSourceOptions } from './database-options';
import { AuditColumnsSubscriber } from './subscribers/audit-columns.subscriber';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => buildDataSourceOptions(config),
    }),
  ],
  providers: [AuditColumnsSubscriber],
})
export class DatabaseModule {}
