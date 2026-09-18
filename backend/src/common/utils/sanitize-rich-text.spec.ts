import { sanitizeRichText, stripHtml } from './sanitize-rich-text';

describe('sanitizeRichText', () => {
  it('keeps allowed formatting', () => {
    expect(sanitizeRichText('<p>Xin <strong>chào</strong></p>')).toBe(
      '<p>Xin <strong>chào</strong></p>',
    );
  });

  it('removes scripts and event handlers', () => {
    const output = sanitizeRichText('<p onclick="x()">Hi</p><script>alert(1)</script>');
    expect(output).toBe('<p>Hi</p>');
  });

  it('drops javascript: links and data: images', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
    expect(sanitizeRichText('<img src="data:image/png;base64,AAAA">')).not.toContain('data:');
  });

  it('forces rel on links and strips style attributes and iframes', () => {
    const output = sanitizeRichText(
      '<a href="https://example.com" style="color:red">x</a><iframe src="https://evil.test"></iframe>',
    );
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).not.toContain('style=');
    expect(output).not.toContain('iframe');
  });

  it('keeps relative upload paths on images', () => {
    expect(sanitizeRichText('<img src="/uploads/2026/01/a.webp" alt="a">')).toContain(
      'src="/uploads/2026/01/a.webp"',
    );
  });
});

describe('stripHtml', () => {
  it('returns collapsed plain text', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b></p>\n<p>again</p>')).toBe('Hello world again');
  });
});
