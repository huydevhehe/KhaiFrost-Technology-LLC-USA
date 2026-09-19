import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PasswordResetCode } from '../entities/password-reset-code.entity';
import { AuthSessionService } from './auth-session.service';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    private readonly sessions: AuthSessionService,
    @InjectRepository(PasswordResetCode) private readonly resetCodes: Repository<PasswordResetCode>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeStaleRecords(): Promise<void> {
    try {
      const sessions = await this.sessions.deleteStale(new Date(Date.now() - RETENTION_MS));
      const codes = await this.resetCodes.delete({
        expiresAt: LessThan(new Date(Date.now() - 86_400_000)),
      });
      this.logger.log(`Removed ${sessions} stale sessions and ${codes.affected ?? 0} reset codes`);
    } catch (error) {
      this.logger.error('Cleanup failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
