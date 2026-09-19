import { Response } from 'supertest';

export interface ParsedCookie {
  name: string;
  value: string;
  attributes: string[];
}

export function parseSetCookies(response: Pick<Response, 'headers'>): ParsedCookie[] {
  const raw = response.headers['set-cookie'] as unknown as string[] | string | undefined;
  const lines = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return lines.map((line) => {
    const [pair, ...attributes] = line.split(';').map((part) => part.trim());
    const separator = pair.indexOf('=');
    return {
      name: pair.slice(0, separator),
      value: decodeURIComponent(pair.slice(separator + 1)),
      attributes,
    };
  });
}

export function findCookie(
  response: Pick<Response, 'headers'>,
  name: string,
): ParsedCookie | undefined {
  return parseSetCookies(response).find((cookie) => cookie.name === name);
}

// A cookie that was cleared has an empty value
export function isCleared(cookie: ParsedCookie | undefined): boolean {
  return !!cookie && cookie.value === '';
}

export function cookieHeader(values: Record<string, string | undefined>): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

export function cookiesFrom(response: Pick<Response, 'headers'>): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const cookie of parseSetCookies(response)) {
    if (cookie.value) jar[cookie.name] = cookie.value;
  }
  return jar;
}
