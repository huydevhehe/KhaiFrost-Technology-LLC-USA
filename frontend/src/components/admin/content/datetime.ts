/** Conversions between ISO timestamps and <input type="datetime-local"> values. */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** ISO string → "2026-09-19T08:30" in local time ("" when empty/invalid). */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** "2026-09-19T08:30" (local) → ISO string, or null when empty/invalid. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** True when the local input value is in the future (a scheduled publication). */
export function isScheduled(value: string): boolean {
  const iso = fromLocalInputValue(value);
  return iso !== null && new Date(iso).getTime() > Date.now();
}

/** ISO → "YYYY-MM-DD" for a date input. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
