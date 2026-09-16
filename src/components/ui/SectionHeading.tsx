import { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
      {children}
    </h2>
  );
}
