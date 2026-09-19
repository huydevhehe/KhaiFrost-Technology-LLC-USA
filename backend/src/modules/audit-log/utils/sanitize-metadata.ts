const SENSITIVE_KEY = /password|passwd|secret|token|authorization|cookie|otp|^code$|hash/i;
const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 500;
const REDACTED = '[redacted]';

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === 'object')
    return sanitizeMetadata(value as Record<string, unknown>, depth + 1);
  return String(value);
}

// Defence in depth: secrets must never reach the audit trail even if a caller passes them by mistake
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    clean[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeValue(value, depth);
  }
  return clean;
}
