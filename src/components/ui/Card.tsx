import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
