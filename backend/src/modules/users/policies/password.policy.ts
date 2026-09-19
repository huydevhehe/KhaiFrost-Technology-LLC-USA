import { validationFailed } from '../../../common/exceptions/exception.factories';
import { COMMON_PASSWORD_BASES, COMMON_PASSWORD_EXACT } from './common-passwords';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordPolicyContext {
  email?: string | null;
}

function isCommonPassword(password: string): boolean {
  const lowered = password.toLowerCase();
  if (COMMON_PASSWORD_EXACT.has(lowered)) return true;
  // Strips digits/symbols around the word so "Password123!" is caught as "password"
  const letters = lowered.replace(/^[^a-z@]+|[^a-z0-9@]+$/g, '').replace(/[0-9]+$/g, '');
  return COMMON_PASSWORD_BASES.has(letters) || COMMON_PASSWORD_BASES.has(lowered);
}

// Returns human readable violations; an empty list means the password is acceptable
export function evaluatePasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
): string[] {
  const violations: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    violations.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    violations.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }
  if (!/\p{Ll}/u.test(password)) violations.push('Password must contain a lowercase letter');
  if (!/\p{Lu}/u.test(password)) violations.push('Password must contain an uppercase letter');
  if (!/\d/.test(password)) violations.push('Password must contain a digit');

  const localPart = context.email?.split('@')[0]?.toLowerCase();
  if (localPart && password.toLowerCase() === localPart) {
    violations.push('Password must not be the same as the email name');
  }
  if (isCommonPassword(password)) violations.push('Password is too common');
  return violations;
}

export function assertPasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
  field = 'password',
): void {
  const violations = evaluatePasswordPolicy(password, context);
  if (violations.length > 0) throw validationFailed([{ field, messages: violations }]);
}
