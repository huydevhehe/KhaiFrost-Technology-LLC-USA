import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Locale } from '../../../common/enums/locale.enum';
import { mailConfig } from '../../../config/mail.config';
import { MAIL_TRANSPORT, MailTransport } from '../interfaces/mail-transport.interface';
import {
  MailTemplateKeyName,
  MailTemplateVariables,
  renderMailTemplate,
} from '../templates/mail-templates';

export interface SendMailInput<Key extends MailTemplateKeyName> {
  to: string;
  templateKey: Key;
  locale: Locale;
  variables: MailTemplateVariables[Key];
  // Overrides the template's own subject
  subject?: string;
}

const SIMPLE_ADDRESS = /^[^\s<>",;\r\n]+@[^\s<>",;\r\n]+$/;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @Inject(mailConfig.KEY) private readonly config: ConfigType<typeof mailConfig>,
  ) {}

  async send<Key extends MailTemplateKeyName>(input: SendMailInput<Key>): Promise<void> {
    if (!SIMPLE_ADDRESS.test(input.to)) {
      throw new Error('Refusing to send mail: recipient is not a single valid address');
    }
    const rendered = renderMailTemplate(input.templateKey, input.locale, input.variables);
    const subject = input.subject
      ? input.subject.replace(/[\r\n]+/g, ' ').trim()
      : rendered.subject;

    await this.transport.send({
      from: this.config.from,
      to: input.to,
      subject,
      html: rendered.html,
      text: rendered.text,
    });
    this.logger.debug(`Sent "${input.templateKey}" mail`);
  }
}
