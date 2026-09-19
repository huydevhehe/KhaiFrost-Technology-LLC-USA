export { formatDateTime } from "@/lib/format";

/** "1,4 MB" — byte count in Vietnamese notation. */
export function formatBytes(bytes: number | null | undefined, fractionDigits = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 ? 0 : fractionDigits;
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: digits })} ${units[unit]}`;
}

/** "19/09/2026" — date only, Vietnamese locale. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", { dateStyle: "short" });
}

/** True when the ISO timestamp is in the future (used for the "scheduled" badge). */
export function isFuture(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time > Date.now();
}

/** "1 200 × 800" pixel dimensions, or "—". */
export function formatDimensions(width: number | null | undefined, height: number | null | undefined): string {
  if (!width || !height) return "—";
  return `${width} × ${height}`;
}
