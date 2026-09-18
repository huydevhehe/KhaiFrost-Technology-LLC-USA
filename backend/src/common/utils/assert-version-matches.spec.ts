import { ErrorCode } from '../constants/error-codes';
import { ApplicationException } from '../exceptions/application.exception';
import { assertVersionMatches } from './assert-version-matches';
import { containsPattern, escapeLikePattern } from './escape-like-pattern';

describe('assertVersionMatches', () => {
  it('passes when versions are equal', () => {
    expect(() => assertVersionMatches(3, 3)).not.toThrow();
  });

  it('throws VERSION_CONFLICT when stale', () => {
    let thrown: unknown;
    try {
      assertVersionMatches(4, 3);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApplicationException);
    expect((thrown as ApplicationException).code).toBe(ErrorCode.VERSION_CONFLICT);
    expect((thrown as ApplicationException).getStatus()).toBe(409);
  });
});

describe('escapeLikePattern', () => {
  it('escapes wildcards and backslashes', () => {
    expect(escapeLikePattern('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(containsPattern(' a_b ')).toBe('%a\\_b%');
  });
});
