import { validationFailed } from '../../../common/exceptions/exception.factories';

export const RESERVED_PATH_PREFIXES = [
  'admin',
  'api',
  'login',
  'register',
  'account',
  'uploads',
  '_next',
] as const;

const SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PATH_LENGTH = 200;
const MAX_SEGMENTS = 5;

// Returns the problem, or null when the path is acceptable
export function describePathProblem(path: string): string | null {
  if (path === '/') return null;
  if (path.length > MAX_PATH_LENGTH) return `path must be at most ${MAX_PATH_LENGTH} characters`;
  if (!path.startsWith('/')) return 'path must start with /';
  const segments = path.slice(1).split('/');
  if (segments.length > MAX_SEGMENTS) return `path can have at most ${MAX_SEGMENTS} segments`;
  if (!segments.every((segment) => SEGMENT_PATTERN.test(segment))) {
    return 'path segments must be lowercase kebab-case (letters, digits and single dashes)';
  }
  if ((RESERVED_PATH_PREFIXES as readonly string[]).includes(segments[0])) {
    return `path must not start with a reserved prefix (${RESERVED_PATH_PREFIXES.join(', ')})`;
  }
  return null;
}

export function assertValidPagePath(path: string): void {
  const problem = describePathProblem(path);
  if (problem) throw validationFailed([{ field: 'path', messages: [problem] }]);
}

// Public lookups are forgiving: case and a trailing slash do not matter
export function normalizeLookupPath(path: string): string {
  const lowered = path.trim().toLowerCase();
  const withSlash = lowered.startsWith('/') ? lowered : `/${lowered}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') || '/' : withSlash;
}
