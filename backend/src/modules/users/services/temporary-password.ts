import { randomInt } from 'node:crypto';

const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';
const ALL = LOWER + UPPER + DIGITS;

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

// Always satisfies the password policy (lower, upper, digit) and avoids look-alike characters
export function generateTemporaryPassword(length = 16): string {
  const characters = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (characters.length < length) characters.push(pick(ALL));
  for (let index = characters.length - 1; index > 0; index--) {
    const swapWith = randomInt(index + 1);
    [characters[index], characters[swapWith]] = [characters[swapWith], characters[index]];
  }
  return characters.join('');
}
