import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { escapeHtml } from './escape-html';

export const MailTemplateKey = {
  PASSWORD_RESET_CODE: 'password-reset-code',
  WELCOME: 'welcome',
} as const;

export type MailTemplateKeyName = (typeof MailTemplateKey)[keyof typeof MailTemplateKey];

export interface MailTemplateVariables {
  [MailTemplateKey.PASSWORD_RESET_CODE]: { code: string; expiresInMinutes: number };
  [MailTemplateKey.WELCOME]: { fullName: string };
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const COMPANY_NAME = 'KhaiFrost Technology';

interface TemplateCopy<Variables> {
  subject: (variables: Variables) => string;
  paragraphs: (variables: Variables) => string[];
  highlight?: (variables: Variables) => string;
  footer: string;
}

type LocalizedTemplate<Variables> = Record<Locale, TemplateCopy<Variables>>;

const TEMPLATES: { [Key in MailTemplateKeyName]: LocalizedTemplate<MailTemplateVariables[Key]> } = {
  [MailTemplateKey.PASSWORD_RESET_CODE]: {
    [Locale.VI]: {
      subject: () => `Mã đặt lại mật khẩu ${COMPANY_NAME}`,
      paragraphs: ({ expiresInMinutes }) => [
        'Xin chào,',
        'Bạn vừa yêu cầu đặt lại mật khẩu. Hãy nhập mã gồm 6 chữ số dưới đây để tiếp tục.',
        `Mã có hiệu lực trong ${expiresInMinutes} phút và chỉ dùng được một lần.`,
      ],
      highlight: ({ code }) => code,
      footer:
        'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Không chia sẻ mã này với bất kỳ ai.',
    },
    [Locale.EN]: {
      subject: () => `${COMPANY_NAME} password reset code`,
      paragraphs: ({ expiresInMinutes }) => [
        'Hello,',
        'You asked to reset your password. Enter the 6-digit code below to continue.',
        `The code is valid for ${expiresInMinutes} minutes and can be used once.`,
      ],
      highlight: ({ code }) => code,
      footer:
        'If you did not request a password reset, you can ignore this email. Never share this code with anyone.',
    },
  },
  [MailTemplateKey.WELCOME]: {
    [Locale.VI]: {
      subject: () => `Chào mừng bạn đến với ${COMPANY_NAME}`,
      paragraphs: ({ fullName }) => [
        `Xin chào ${fullName},`,
        `Tài khoản của bạn tại ${COMPANY_NAME} đã được tạo thành công.`,
        'Cảm ơn bạn đã đăng ký. Bạn có thể đăng nhập bằng email hoặc số điện thoại đã đăng ký.',
      ],
      footer: 'Nếu bạn không tạo tài khoản này, vui lòng liên hệ với chúng tôi.',
    },
    [Locale.EN]: {
      subject: () => `Welcome to ${COMPANY_NAME}`,
      paragraphs: ({ fullName }) => [
        `Hello ${fullName},`,
        `Your ${COMPANY_NAME} account has been created.`,
        'Thank you for registering. You can sign in with the email or phone number you registered.',
      ],
      footer: 'If you did not create this account, please contact us.',
    },
  },
};

function stripLineBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

// Variables are escaped for HTML; the plain-text part keeps them verbatim
export function renderMailTemplate<Key extends MailTemplateKeyName>(
  key: Key,
  locale: Locale | string,
  variables: MailTemplateVariables[Key],
): RenderedMail {
  const localized = TEMPLATES[key] as LocalizedTemplate<MailTemplateVariables[Key]>;
  const copy = localized[locale as Locale] ?? localized[DEFAULT_LOCALE];

  const paragraphs = copy.paragraphs(variables);
  const highlight = copy.highlight?.(variables);

  const html = [
    '<!doctype html>',
    '<html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2933">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">',
    '<table role="presentation" width="480" cellspacing="0" cellpadding="24" style="max-width:480px;background:#ffffff;border-radius:8px">',
    `<tr><td><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(COMPANY_NAME)}</h1>`,
    ...paragraphs.map(
      (paragraph) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(paragraph)}</p>`,
    ),
    highlight
      ? `<p style="margin:16px 0;font-size:28px;letter-spacing:6px;font-weight:bold">${escapeHtml(highlight)}</p>`
      : '',
    `<p style="margin:16px 0 0;font-size:12px;color:#697586">${escapeHtml(copy.footer)}</p>`,
    '</td></tr></table></td></tr></table></body></html>',
  ].join('');

  const text = [...paragraphs, ...(highlight ? [highlight] : []), copy.footer].join('\n\n');
  return { subject: stripLineBreaks(copy.subject(variables)), html, text };
}
