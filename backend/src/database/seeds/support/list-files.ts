import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Every regular file below a directory, in a stable order
export function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files.sort();
}
