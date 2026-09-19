import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY = 'kf:allowPasswordChangePending';

// Marks routes that stay usable while an account still has to replace its temporary password:
// reading the profile, changing the password and signing out
export const AllowPasswordChangePending = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);
