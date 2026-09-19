import { extractEntityId } from '../interceptors/audit-action.interceptor';
import { sanitizeMetadata } from './sanitize-metadata';
import { toCsvCell, toCsvLine } from './csv';

describe('toCsvCell', () => {
  it('leaves plain values alone and blanks null', () => {
    expect(toCsvCell('hello')).toBe('hello');
    expect(toCsvCell(null)).toBe('');
    expect(toCsvCell(undefined)).toBe('');
    expect(toCsvCell(200)).toBe('200');
  });

  it('quotes cells with commas, quotes and line breaks', () => {
    expect(toCsvCell('a,b')).toBe('"a,b"');
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it.each(['=SUM(A1)', '+1+1', '-2+3', '@cmd', '\tTAB', '  =HYPERLINK("x")'])(
    'neutralises spreadsheet formula %p',
    (value) => {
      expect(toCsvCell(value).replace(/^"/, '').startsWith("'")).toBe(true);
    },
  );

  it('serialises dates and objects', () => {
    expect(toCsvCell(new Date('2025-01-02T03:04:05.000Z'))).toBe('2025-01-02T03:04:05.000Z');
    expect(toCsvCell({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('terminates lines with CRLF', () => {
    expect(toCsvLine(['a', 'b'])).toBe('a,b\r\n');
  });
});

describe('sanitizeMetadata', () => {
  it('redacts secrets at any depth', () => {
    expect(
      sanitizeMetadata({
        method: 'POST',
        password: 'x',
        nested: { refreshToken: 'y', ok: 1, code: '123456' },
        list: [{ Authorization: 'Bearer z' }],
      }),
    ).toEqual({
      method: 'POST',
      password: '[redacted]',
      nested: { refreshToken: '[redacted]', ok: 1, code: '[redacted]' },
      list: [{ Authorization: '[redacted]' }],
    });
  });

  it('truncates very long strings and deep structures', () => {
    const result = sanitizeMetadata({
      text: 'x'.repeat(2000),
      deep: { a: { b: { c: { d: { e: 1 } } } } },
    });
    expect((result.text as string).length).toBeLessThan(600);
    expect(JSON.stringify(result.deep)).toContain('[truncated]');
  });
});

describe('extractEntityId', () => {
  it('prefers the response id, then enveloped id, then the route id', () => {
    expect(extractEntityId({ id: 'r1' }, 'p1')).toBe('r1');
    expect(extractEntityId({ data: { id: 'r2' } }, 'p1')).toBe('r2');
    expect(extractEntityId(undefined, 'p1')).toBe('p1');
    expect(extractEntityId(null, undefined)).toBeUndefined();
  });
});
