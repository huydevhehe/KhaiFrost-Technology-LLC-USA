import { ReactNode } from "react";

export function SectionHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-2xl font-bold text-slate-900 sm:text-3xl ${className}`}>
      {children}
    </h2>
  );
}
