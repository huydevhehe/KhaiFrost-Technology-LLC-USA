import { createTransport, Transporter } from 'nodemailer';
import { MailConfig } from '../../../config/mail.config';
import { MailTransport, OutgoingMail } from '../interfaces/mail-transport.interface';

export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(config: MailConfig['smtp']) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      // Implicit TLS on 465, STARTTLS upgrade otherwise
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(mail: OutgoingMail): Promise<void> {
    await this.transporter.sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }
}
