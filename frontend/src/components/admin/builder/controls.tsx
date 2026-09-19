"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

const TONE_CLASSES: Record<ButtonTone, string> = {
  primary: "bg-accent text-white hover:bg-accent/90 focus:ring-accent/30",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-accent/30",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-200",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-accent/30",
};

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  /** Shows a spinner and disables the button. */
  pending?: boolean;
  icon?: ReactNode;
  size?: "sm" | "md";
}

/** Button with pending state and disabled styling (the mock ui.tsx buttons have neither). */
export function ActionButton({
  tone = "secondary",
  pending = false,
  icon,
  size = "md",
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${padding} ${TONE_CLASSES[tone]} ${className}`}
    >
      {pending ? <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** Small neutral chip, e.g. "Trang hệ thống". */
export function Chip({
  children,
  tone = "slate",
  title,
}: {
  children: ReactNode;
  tone?: "slate" | "amber" | "emerald" | "sky" | "red";
  title?: string;
}) {
  const classes: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

/** Warns before the tab is closed while there are unsaved changes. */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
