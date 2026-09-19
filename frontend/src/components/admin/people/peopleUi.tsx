"use client";

import type { Role } from "@/lib/api/types";
import { USER_ROLE_LABELS, USER_STATUS_LABELS, type StaffRole, type UserStatus } from "@/lib/api/admin/users";

/** Inline validation message under a form field. */
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-red-600">
      {message}
    </p>
  );
}

const ROLE_TONES: Record<StaffRole, string> = {
  owner: "bg-sky-50 text-sky-700",
  admin: "bg-indigo-50 text-indigo-700",
  staff: "bg-slate-100 text-slate-600",
};

export function RoleBadge({ role }: { role: Role }) {
  const tone = ROLE_TONES[role as StaffRole] ?? "bg-slate-100 text-slate-600";
  const label = USER_ROLE_LABELS[role as StaffRole] ?? "Khách hàng";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: UserStatus }) {
  const tone = status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {USER_STATUS_LABELS[status]}
    </span>
  );
}

/** Round avatar fallback with the person's initials. */
export function InitialsAvatar({ name, url }: { name: string; url?: string | null }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the API host, not the Next image loader
      <img src={url} alt="" className="h-8 w-8 rounded-full object-cover" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
    >
      {initials || "?"}
    </span>
  );
}
