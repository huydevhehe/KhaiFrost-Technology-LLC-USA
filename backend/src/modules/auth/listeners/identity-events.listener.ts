import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CredentialsPurgeRequestedPayload,
  SessionsRevokeRequestedPayload,
  UserCreatedPayload,
  UserEvent,
} from '../../users/events/user-events';
import { AuthIdentity } from '../entities/auth-identity.entity';
import { PasswordResetCode } from '../entities/password-reset-code.entity';
import { AuthProvider } from '../enums/auth-provider.enum';
import { AuthSessionService } from '../services/auth-session.service';

// The users side announces what happened; this module owns the credential tables and reacts
@Injectable()
export class IdentityEventsListener {
  private readonly logger = new Logger(IdentityEventsListener.name);

  constructor(
    @InjectRepository(AuthIdentity) private readonly identities: Repository<AuthIdentity>,
    @InjectRepository(PasswordResetCode) private readonly resetCodes: Repository<PasswordResetCode>,
    private readonly sessions: AuthSessionService,
  ) {}

  @OnEvent(UserEvent.CREATED)
  async onUserCreated(payload: UserCreatedPayload): Promise<void> {
    try {
      await this.identities
        .createQueryBuilder()
        .insert()
        .values({
          userId: payload.userId,
          provider: AuthProvider.PASSWORD,
          providerUserId: payload.userId,
        })
        .orIgnore()
        .execute();
    } catch (error) {
      this.logger.error(
        'Could not create the password identity',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Failures propagate to the emitter on purpose: a revocation that did not happen must not look successful
  @OnEvent(UserEvent.SESSIONS_REVOKE_REQUESTED, { suppressErrors: false })
  async onSessionsRevokeRequested(payload: SessionsRevokeRequestedPayload): Promise<void> {
    await this.sessions.revokeAllForUser(payload.userId, payload.reason);
  }

  @OnEvent(UserEvent.CREDENTIALS_PURGE_REQUESTED, { suppressErrors: false })
  async onCredentialsPurgeRequested(payload: CredentialsPurgeRequestedPayload): Promise<void> {
    await this.sessions.revokeAllForUser(payload.userId, payload.reason);
    await this.identities.delete({ userId: payload.userId });
    await this.resetCodes.delete({ userId: payload.userId });
  }
}
