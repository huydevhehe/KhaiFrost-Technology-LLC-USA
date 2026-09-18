type BadgeTone = "green" | "red" | "blue" | "slate" | "amber";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  blue: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-50 text-amber-600",
};

const statusToneMap: Record<string, BadgeTone> = {
  Active: "green",
  Published: "green",
  Locked: "red",
  Draft: "amber",
  Owner: "blue",
  Admin: "blue",
  Staff: "slate",
  Inactive: "slate",
  Mới: "blue",
  "Đã xem": "amber",
  "Đã phản hồi": "green",
};

export function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  const resolvedTone = tone ?? statusToneMap[status] ?? "slate";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[resolvedTone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
