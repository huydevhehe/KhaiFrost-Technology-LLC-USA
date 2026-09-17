"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { getScrollDirection } from "@/lib/scrollDirection";

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDirection(getScrollDirection());
        }
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTranslate = direction === "down" ? "translate-y-10" : "-translate-y-10";

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : `${hiddenTranslate} opacity-0`
      } ${className}`}
    >
      {children}
    </div>
  );
}
