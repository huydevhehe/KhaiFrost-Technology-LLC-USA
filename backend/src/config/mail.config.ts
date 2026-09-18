import { ConfigType, registerAs } from '@nestjs/config';
import { loadEnvironment } from './environment';

export const mailConfig = registerAs('mail', () => {
  const env = loadEnvironment();
  return {
    driver: env.MAIL_DRIVER,
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
  };
});

export type MailConfig = ConfigType<typeof mailConfig>;
