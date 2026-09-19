import { Logger } from '@nestjs/common';
import { MailTransport, OutgoingMail } from '../interfaces/mail-transport.interface';

// Development only: prints the message (including any codes in it) instead of sending it
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('MailLog');

  constructor(isProduction: boolean) {
    if (isProduction) {
      throw new Error(
        'MAIL_DRIVER=log is not allowed in production: set MAIL_DRIVER=smtp and configure SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD',
      );
    }
  }

  send(mail: OutgoingMail): Promise<void> {
    this.logger.log(
      `Mail (not sent, log driver)\nFrom: ${mail.from}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`,
    );
    return Promise.resolve();
  }
}
