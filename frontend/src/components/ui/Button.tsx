import Link from "next/link";
import { ReactNode } from "react";

type ButtonVariant = "primary-blue" | "primary-pill-light" | "outline-dark";

interface ButtonProps {
  href?: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}

const variantClasses: Record<ButtonVariant, string> = {
  "primary-blue": "bg-accent text-white hover:bg-accent/90",
  "primary-pill-light": "bg-white text-slate-900 hover:bg-slate-100",
  "outline-dark": "border border-white/40 text-white hover:bg-white/10",
};

export function Button({
  href,
  variant = "primary-blue",
  icon,
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  const classes = `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${variantClasses[variant]}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {icon}
      {children}
    </button>
  );
}
