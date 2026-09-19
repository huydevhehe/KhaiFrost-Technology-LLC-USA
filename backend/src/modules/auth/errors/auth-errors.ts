import {
  badRequest,
  forbidden,
  unauthorized,
} from '../../../common/exceptions/exception.factories';

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_RESET_CODE: 'INVALID_RESET_CODE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

// Identical for "unknown identifier" and "wrong password" so accounts cannot be enumerated
export function invalidCredentials() {
  return unauthorized('The credentials are not valid', AuthErrorCode.INVALID_CREDENTIALS);
}

export function accountLocked() {
  return forbidden(
    'This account is locked, please try again later or contact support',
    AuthErrorCode.ACCOUNT_LOCKED,
  );
}

// 403 rather than 401 so clients do not mistake a wrong re-entered password for an expired session
export function invalidPassword() {
  return forbidden('The password is not correct', AuthErrorCode.INVALID_PASSWORD);
}

export function invalidResetCode() {
  return badRequest(
    AuthErrorCode.INVALID_RESET_CODE,
    'The code is invalid or has expired, request a new one',
  );
}

export function sessionExpired() {
  return unauthorized('The session is no longer valid', AuthErrorCode.SESSION_EXPIRED);
}
