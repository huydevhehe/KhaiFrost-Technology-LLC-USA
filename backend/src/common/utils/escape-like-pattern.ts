// Makes user input literal inside ILIKE/LIKE (backslash is the default escape character in PostgreSQL)
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function containsPattern(input: string): string {
  return `%${escapeLikePattern(input.trim())}%`;
}
