import { basename, extname } from 'node:path';
import { MEDIA_FOLDER_LABELS_VI, MEDIA_WORDS_VI } from '../seed-generated-content';

export interface DerivedAltText {
  vi: string;
  en: string;
}

function capitalize(word: string): string {
  return word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);
}

// "team-1.jpg" in "about" becomes "About - Team 1" / "Giới thiệu - Đội ngũ 1"
export function deriveAltText(relativePath: string): DerivedAltText {
  const segments = relativePath.split('/');
  const fileWords = basename(segments[segments.length - 1], extname(segments[segments.length - 1]))
    .split(/[-_\s]+/)
    .filter(Boolean);
  const folder = segments.length > 1 ? segments[segments.length - 2] : null;

  const en = [
    ...(folder ? [folder.split('-').map(capitalize).join(' ')] : []),
    fileWords.map(capitalize).join(' '),
  ].join(' - ');
  const vi = [
    ...(folder
      ? [MEDIA_FOLDER_LABELS_VI[folder] ?? folder.split('-').map(capitalize).join(' ')]
      : []),
    fileWords.map((word) => MEDIA_WORDS_VI[word.toLowerCase()] ?? capitalize(word)).join(' '),
  ].join(' - ');
  return { vi: vi.slice(0, 200), en: en.slice(0, 200) };
}

export function deriveFolder(relativePath: string): string | null {
  const segments = relativePath.split('/');
  return segments.length > 1 ? segments.slice(0, -1).join('/') : null;
}
