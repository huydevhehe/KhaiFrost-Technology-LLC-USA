import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '../../config/app.config';
import { mailConfig } from '../../config/mail.config';
import { MAIL_TRANSPORT, MailTransport } from './interfaces/mail-transport.interface';
import { MailEventListener } from './listeners/mail-event.listener';
import { MailService } from './services/mail.service';
import { LogMailTransport } from './transports/log-mail.transport';
import { SmtpMailTransport } from './transports/smtp-mail.transport';

export function createMailTransport(
  mail: ConfigType<typeof mailConfig>,
  app: Pick<ConfigType<typeof appConfig>, 'isProduction'>,
): MailTransport {
  return mail.driver === 'smtp'
    ? new SmtpMailTransport(mail.smtp)
    : new LogMailTransport(app.isProduction);
}

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [mailConfig.KEY, appConfig.KEY],
      useFactory: createMailTransport,
    },
    MailService,
    MailEventListener,
  ],
  exports: [MailService],
})
export class MailModule {}
