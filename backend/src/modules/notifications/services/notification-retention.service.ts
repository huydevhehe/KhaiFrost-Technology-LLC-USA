import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { NOTIFICATION_RETENTION_DAYS } from '../constants/notification.constants';
import { Notification } from '../entities/notification.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationRetentionService {
  private readonly logger = new Logger(NotificationRetentionService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runScheduledPurge(): Promise<void> {
    try {
      const removed = await this.purgeExpired();
      this.logger.log(`Removed ${removed} notifications past retention`);
    } catch (error) {
      this.logger.error('Purge failed', error instanceof Error ? error.stack : String(error));
    }
  }

  async purgeExpired(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS);
    const result = await this.notifications.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
