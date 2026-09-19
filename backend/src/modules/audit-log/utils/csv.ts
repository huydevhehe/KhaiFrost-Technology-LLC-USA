const FORMULA_START = /^[\t\r ]*[=+\-@]|^[\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;

// Cells that a spreadsheet would evaluate as a formula are neutralised with a leading apostrophe
export function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);

  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvLine(cells: readonly unknown[]): string {
  return `${cells.map(toCsvCell).join(',')}\r\n`;
}
