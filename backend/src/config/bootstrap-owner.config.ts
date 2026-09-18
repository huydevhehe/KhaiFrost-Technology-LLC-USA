import { ConfigType, registerAs } from '@nestjs/config';
import { loadEnvironment } from './environment';

export const bootstrapOwnerConfig = registerAs('bootstrapOwner', () => {
  const env = loadEnvironment();
  return {
    email: env.BOOTSTRAP_OWNER_EMAIL,
    phone: env.BOOTSTRAP_OWNER_PHONE,
    fullName: env.BOOTSTRAP_OWNER_FULL_NAME,
    password: env.BOOTSTRAP_OWNER_PASSWORD,
  };
});

export type BootstrapOwnerConfig = ConfigType<typeof bootstrapOwnerConfig>;
