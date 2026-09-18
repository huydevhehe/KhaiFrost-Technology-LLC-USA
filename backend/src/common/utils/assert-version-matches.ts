import { ErrorCode } from '../constants/error-codes';
import { conflict } from '../exceptions/exception.factories';

// Optimistic locking: the client sends the version it last read; a stale write is rejected instead of overwriting
export function assertVersionMatches(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw conflict(
      ErrorCode.VERSION_CONFLICT,
      'This record was modified by someone else; reload it and try again',
      { currentVersion, expectedVersion },
    );
  }
}
