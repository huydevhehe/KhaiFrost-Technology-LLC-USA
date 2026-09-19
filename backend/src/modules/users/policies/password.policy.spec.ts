import { ApplicationException } from '../../../common/exceptions/application.exception';
import { assertPasswordPolicy, evaluatePasswordPolicy } from './password.policy';

describe('password policy', () => {
  it('accepts a strong password', () => {
    expect(evaluatePasswordPolicy('Correct-Horse-7-Battery')).toEqual([]);
  });

  it('requires at least 10 characters', () => {
    expect(evaluatePasswordPolicy('Ab1defghi')).toContain(
      'Password must be at least 10 characters',
    );
    expect(evaluatePasswordPolicy('Ab1defghij')).toEqual([]);
  });

  it('allows at most 128 characters', () => {
    expect(evaluatePasswordPolicy(`Aa1${'x'.repeat(125)}`)).toEqual([]);
    expect(evaluatePasswordPolicy(`Aa1${'x'.repeat(126)}`)).toContain(
      'Password must be at most 128 characters',
    );
  });

  it('requires a lowercase letter, an uppercase letter and a digit', () => {
    expect(evaluatePasswordPolicy('ABCDEFGHIJ1')).toContain(
      'Password must contain a lowercase letter',
    );
    expect(evaluatePasswordPolicy('abcdefghij1')).toContain(
      'Password must contain an uppercase letter',
    );
    expect(evaluatePasswordPolicy('Abcdefghijk')).toContain('Password must contain a digit');
  });

  it('accepts non-ASCII letters as cased letters', () => {
    expect(evaluatePasswordPolicy('Đăngnhập-2024-Xin')).toEqual([]);
  });

  it('rejects a password equal to the email local part', () => {
    expect(evaluatePasswordPolicy('Owner12345X', { email: 'owner12345x@khaifrost.com' })).toContain(
      'Password must not be the same as the email name',
    );
    expect(evaluatePasswordPolicy('Owner12345X', { email: 'someone@khaifrost.com' })).toEqual([]);
  });

  it.each([
    'Password123',
    'Passw0rd!!!!',
    'Qwerty12345',
    'Welcome2024!',
    'KhaiFrost2024',
    '1234567890',
  ])('rejects the common password %s', (password) => {
    expect(evaluatePasswordPolicy(password)).toContain('Password is too common');
  });

  it('throws a validation error naming the field', () => {
    try {
      assertPasswordPolicy('short', {}, 'newPassword');
      fail('expected a validation error');
    } catch (error) {
      const exception = error as ApplicationException;
      expect(exception.code).toBe('VALIDATION_FAILED');
      expect(exception.details).toEqual([
        { field: 'newPassword', messages: expect.arrayContaining([expect.any(String)]) },
      ]);
    }
  });
});
