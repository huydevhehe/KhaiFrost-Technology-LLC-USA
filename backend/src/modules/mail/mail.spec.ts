import { Locale } from '../../common/enums/locale.enum';
import { DomainEvent } from '../../common/constants/domain-events';
import { MailTransport, OutgoingMail } from './interfaces/mail-transport.interface';
import { MailEventListener } from './listeners/mail-event.listener';
import { createMailTransport } from './mail.module';
import { MailService } from './services/mail.service';
import { escapeHtml } from './templates/escape-html';
import { MailTemplateKey, renderMailTemplate } from './templates/mail-templates';
import { LogMailTransport } from './transports/log-mail.transport';
import { SmtpMailTransport } from './transports/smtp-mail.transport';

class FakeTransport implements MailTransport {
  readonly sent: OutgoingMail[] = [];
  failWith?: Error;
  send(mail: OutgoingMail): Promise<void> {
    if (this.failWith) return Promise.reject(this.failWith);
    this.sent.push(mail);
    return Promise.resolve();
  }
}

const mailConfig = {
  driver: 'log' as const,
  from: 'KhaiFrost <no-reply@khaifrost.test>',
  smtp: { host: '', port: 587, user: '', password: '' },
};

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<script>alert("x")&'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;',
    );
  });
});

describe('mail templates', () => {
  it('renders the reset code in both languages', () => {
    const vi = renderMailTemplate(MailTemplateKey.PASSWORD_RESET_CODE, Locale.VI, {
      code: '123456',
      expiresInMinutes: 10,
    });
    const en = renderMailTemplate(MailTemplateKey.PASSWORD_RESET_CODE, Locale.EN, {
      code: '123456',
      expiresInMinutes: 10,
    });
    expect(vi.subject).toContain('Mã đặt lại mật khẩu');
    expect(en.subject).toContain('password reset code');
    for (const mail of [vi, en]) {
      expect(mail.html).toContain('123456');
      expect(mail.text).toContain('123456');
      expect(mail.text).toContain('10');
    }
  });

  it('renders the welcome mail in both languages', () => {
    expect(
      renderMailTemplate(MailTemplateKey.WELCOME, Locale.VI, { fullName: 'An' }).text,
    ).toContain('Xin chào An');
    expect(
      renderMailTemplate(MailTemplateKey.WELCOME, Locale.EN, { fullName: 'An' }).text,
    ).toContain('Hello An');
  });

  it('falls back to Vietnamese for an unknown locale', () => {
    expect(renderMailTemplate(MailTemplateKey.WELCOME, 'fr', { fullName: 'An' }).text).toContain(
      'Xin chào',
    );
  });

  it('escapes variables in the html part and keeps text verbatim', () => {
    const mail = renderMailTemplate(MailTemplateKey.WELCOME, Locale.EN, {
      fullName: '<img src=x onerror=alert(1)>',
    });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(mail.text).toContain('<img src=x onerror=alert(1)>');
  });

  it('keeps line breaks out of the subject', () => {
    const mail = renderMailTemplate(MailTemplateKey.WELCOME, Locale.EN, {
      fullName: 'x\r\nBcc: evil',
    });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

describe('MailService', () => {
  it('renders and hands the message to the transport with the configured sender', async () => {
    const transport = new FakeTransport();
    const service = new MailService(transport, mailConfig);
    await service.send({
      to: 'user@example.com',
      templateKey: MailTemplateKey.PASSWORD_RESET_CODE,
      locale: Locale.EN,
      variables: { code: '654321', expiresInMinutes: 15 },
    });
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({ from: mailConfig.from, to: 'user@example.com' });
    expect(transport.sent[0].text).toContain('654321');
  });

  it('lets the caller override the subject and strips line breaks', async () => {
    const transport = new FakeTransport();
    await new MailService(transport, mailConfig).send({
      to: 'user@example.com',
      templateKey: MailTemplateKey.WELCOME,
      locale: Locale.VI,
      variables: { fullName: 'An' },
      subject: 'Hi\r\nBcc: x@y.z',
    });
    expect(transport.sent[0].subject).toBe('Hi Bcc: x@y.z');
  });

  it.each(['a@b.c\r\nBcc: evil@x.y', 'a@b.c, d@e.f', '', 'no-at-sign'])(
    'refuses the recipient %p',
    async (to) => {
      const transport = new FakeTransport();
      await expect(
        new MailService(transport, mailConfig).send({
          to,
          templateKey: MailTemplateKey.WELCOME,
          locale: Locale.EN,
          variables: { fullName: 'x' },
        }),
      ).rejects.toThrow();
      expect(transport.sent).toHaveLength(0);
    },
  );
});

describe('MailEventListener', () => {
  it('sends the reset code on PASSWORD_RESET_REQUESTED', async () => {
    const transport = new FakeTransport();
    const listener = new MailEventListener(new MailService(transport, mailConfig));
    await listener.onPasswordResetRequested({
      email: 'user@example.com',
      code: '111222',
      locale: Locale.VI,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    expect(transport.sent[0].to).toBe('user@example.com');
    expect(transport.sent[0].text).toContain('111222');
  });

  it('sends the welcome mail on USER_REGISTERED and skips users without email', async () => {
    const transport = new FakeTransport();
    const listener = new MailEventListener(new MailService(transport, mailConfig));
    await listener.onUserRegistered({ userId: 'u', email: null, fullName: 'A', locale: Locale.EN });
    expect(transport.sent).toHaveLength(0);
    await listener.onUserRegistered({
      userId: 'u',
      email: 'a@b.co',
      fullName: 'A',
      locale: Locale.EN,
    });
    expect(transport.sent).toHaveLength(1);
  });

  it('swallows transport failures', async () => {
    const transport = new FakeTransport();
    transport.failWith = new Error('smtp down');
    const listener = new MailEventListener(new MailService(transport, mailConfig));
    await expect(
      listener.onUserRegistered({ userId: 'u', email: 'a@b.co', fullName: 'A', locale: Locale.EN }),
    ).resolves.toBeUndefined();
  });

  it('listens to the documented domain events', () => {
    const reset = Reflect.getMetadataKeys(MailEventListener.prototype.onPasswordResetRequested);
    expect(reset.length).toBeGreaterThan(0);
    expect(DomainEvent.PASSWORD_RESET_REQUESTED).toBe('password-reset.requested');
  });
});

describe('mail transport selection', () => {
  it('uses the log transport in development and refuses it in production', () => {
    expect(createMailTransport(mailConfig, { isProduction: false })).toBeInstanceOf(
      LogMailTransport,
    );
    expect(() => createMailTransport(mailConfig, { isProduction: true })).toThrow(
      /not allowed in production/,
    );
  });

  it('uses SMTP when configured, in any environment', () => {
    const smtp = {
      ...mailConfig,
      driver: 'smtp' as const,
      smtp: { ...mailConfig.smtp, host: 'smtp.example.com' },
    };
    expect(createMailTransport(smtp, { isProduction: true })).toBeInstanceOf(SmtpMailTransport);
  });
});
