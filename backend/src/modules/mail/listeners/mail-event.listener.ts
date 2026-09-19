import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DomainEvent,
  PasswordResetRequestedEvent,
  UserRegisteredEvent,
} from '../../../common/constants/domain-events';
import { MailService } from '../services/mail.service';
import { MailTemplateKey } from '../templates/mail-templates';

// A failing mail transport must never fail the request that triggered the event
@Injectable()
export class MailEventListener {
  private readonly logger = new Logger(MailEventListener.name);

  constructor(private readonly mail: MailService) {}

  @OnEvent(DomainEvent.PASSWORD_RESET_REQUESTED)
  async onPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    const remainingMs = event.expiresAt.getTime() - Date.now();
    try {
      await this.mail.send({
        to: event.email,
        templateKey: MailTemplateKey.PASSWORD_RESET_CODE,
        locale: event.locale,
        variables: {
          code: event.code,
          expiresInMinutes: Math.max(1, Math.round(remainingMs / 60_000)),
        },
      });
    } catch (error) {
      this.logger.error(
        'Could not send password reset mail',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent(DomainEvent.USER_REGISTERED)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    if (!event.email) return;
    try {
      await this.mail.send({
        to: event.email,
        templateKey: MailTemplateKey.WELCOME,
        locale: event.locale,
        variables: { fullName: event.fullName },
      });
    } catch (error) {
      this.logger.error(
        'Could not send welcome mail',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
