import { sanitizeRichText, stripHtml } from '../../../common/utils/sanitize-rich-text';

const WORDS_PER_MINUTE = 200;
const EXCERPT_MAX_LENGTH = 200;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

// stripHtml escapes the characters it keeps (&amp;); undo that so titles read "AI & Cloud", not "AI &amp; Cloud"
export function toPlainText(value: string): string {
  return stripHtml(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

export function computeReadingTimeMinutes(contentHtml: string): number {
  const text = stripHtml(contentHtml);
  if (!text) return 1;
  const words = text.split(' ').length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

// Cuts at a word boundary so the excerpt never ends mid-word
export function deriveExcerpt(contentHtml: string, maxLength = EXCERPT_MAX_LENGTH): string {
  const text = toPlainText(contentHtml);
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLength / 2 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s.,;:!?-]+$/, '')}…`;
}

export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = toPlainText(raw).slice(0, MAX_TAG_LENGTH).trim();
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= MAX_TAGS) break;
  }
  return result;
}

export function sanitizeContent(contentHtml: string): string {
  return sanitizeRichText(contentHtml);
}
