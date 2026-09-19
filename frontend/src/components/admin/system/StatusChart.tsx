"use client";

import type { ReactNode } from "react";

export interface StatusSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

function total(segments: StatusSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.value, 0);
}

function percent(value: number, sum: number): number {
  if (sum <= 0) return 0;
  return Math.round((value / sum) * 1000) / 10;
}

export interface StatusBarProps {
  title: string;
  href?: ReactNode;
  segments: StatusSegment[];
  emptyLabel?: string;
}

/** One stacked bar per content type, drawn as plain SVG rectangles. */
export function StatusBar({ title, segments, emptyLabel = "Chưa có dữ liệu" }: StatusBarProps) {
  const sum = total(segments);
  const width = 100;
  const offsets = segments.map((_, index) =>
    segments.slice(0, index).reduce((acc, item) => acc + (sum > 0 ? (item.value / sum) * width : 0), 0),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <span className="text-xs text-slate-400">{sum.toLocaleString("vi-VN")} mục</span>
      </div>
      {sum === 0 ? (
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <svg
          viewBox={`0 0 ${width} 8`}
          preserveAspectRatio="none"
          className="h-2.5 w-full overflow-hidden rounded-full"
          role="img"
          aria-label={`${title}: ${segments
            .filter((segment) => segment.value > 0)
            .map((segment) => `${segment.label} ${segment.value}`)
            .join(", ")}`}
        >
          {segments.map((segment, index) => {
            const segmentWidth = (segment.value / sum) * width;
            const x = offsets[index];
            if (segment.value === 0) return null;
            return <rect key={segment.key} x={x} y={0} width={segmentWidth} height={8} fill={segment.color} />;
          })}
        </svg>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <li key={segment.key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
              <span className="font-medium text-slate-700">{segment.value.toLocaleString("vi-VN")}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export interface StatusDonutProps {
  segments: StatusSegment[];
  centerLabel: string;
  centerValue: string;
  emptyLabel?: string;
}

/** Donut built from stroke-dasharray arcs, matching the existing chart style. */
export function StatusDonut({
  segments,
  centerLabel,
  centerValue,
  emptyLabel = "Chưa có dữ liệu",
}: StatusDonutProps) {
  const sum = total(segments);
  const size = 160;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const cumulatives = segments.map((_, index) =>
    segments.slice(0, index).reduce((acc, item) => acc + item.value, 0),
  );

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
            <circle r={radius} fill="none" stroke="#E2E8F0" strokeWidth={20} />
            {sum > 0 &&
              segments.map((segment, index) => {
                if (segment.value === 0) return null;
                const dash = (segment.value / sum) * circumference;
                const dashOffset = -((cumulatives[index] / sum) * circumference);
                return (
                  <circle
                    key={segment.key}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={20}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{centerValue}</span>
          <span className="text-[11px] text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex min-w-[9rem] flex-col gap-2">
        {sum === 0 && <li className="text-sm text-slate-400">{emptyLabel}</li>}
        {sum > 0 &&
          segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
              <span className="ml-auto font-medium text-slate-900">
                {segment.value.toLocaleString("vi-VN")}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {percent(segment.value, sum)}%
                </span>
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export const PUBLICATION_COLORS = {
  draft: "#94A3B8",
  in_review: "#F59E0B",
  published: "#10B981",
  archived: "#CBD5E1",
} as const;

export const CONTACT_COLORS = {
  new: "#0EA5E9",
  seen: "#F59E0B",
  replied: "#10B981",
  archived: "#CBD5E1",
} as const;
