import { QueryFailedError } from 'typeorm';

export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
  if (driverError?.code !== '23505') return false;
  return constraintName ? driverError.constraint === constraintName : true;
}
