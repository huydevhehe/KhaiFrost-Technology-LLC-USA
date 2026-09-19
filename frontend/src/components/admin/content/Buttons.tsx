"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90 focus:ring-accent/30",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-accent/30",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-200",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-accent/30",
};

export interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** Shows a spinner and blocks clicks. */
  pending?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/** Admin action button with pending state — same look as the shared ui buttons. */
export function ActionButton({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  icon,
  pending = false,
  disabled = false,
  title,
  className = "",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export interface RowIconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  className?: string;
}

/** Small icon button for table rows. */
export function RowIconButton({
  children,
  onClick,
  title,
  disabled = false,
  tone = "default",
  className = "",
}: RowIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "text-red-500 hover:bg-red-50"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      } ${className}`}
    >
      {children}
    </button>
  );
}
