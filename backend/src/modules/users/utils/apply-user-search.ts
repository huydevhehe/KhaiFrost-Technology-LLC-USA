import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { containsPattern } from '../../../common/utils/escape-like-pattern';

// Phones are stored as E.164, so "0987 000 222" must be searchable by its national digits too
function phoneDigitsFor(search: string): string | null {
  if (!/^[\d\s+.()-]+$/.test(search)) return null;
  const digits = search.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 3 ? digits : null;
}

// The query builder must alias the users table as "user"
export function applyUserSearch<Entity extends ObjectLiteral>(
  builder: SelectQueryBuilder<Entity>,
  search: string,
): void {
  const digits = phoneDigitsFor(search);
  builder.andWhere(
    `(user.fullName ILIKE :pattern OR user.email ILIKE :pattern OR user.phone ILIKE :pattern${
      digits ? ' OR user.phone ILIKE :phonePattern' : ''
    })`,
    { pattern: containsPattern(search), ...(digits && { phonePattern: containsPattern(digits) }) },
  );
}
