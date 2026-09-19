"use client";

import Link from "next/link";
import { AlertTriangle, Check, CircleAlert, Info, X } from "lucide-react";
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  entityLabel,
  issueLabel,
  issueRoute,
  type ContentHealthIssue,
  type IssueSeverity,
  type ReadinessCheck,
} from "@/lib/api/admin/contentHealth";

const SEVERITY_STYLES: Record<IssueSeverity, string> = {
  critical: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
};

export function SeverityChip({ severity }: { severity: IssueSeverity }) {
  const Icon = severity === "critical" ? CircleAlert : severity === "warning" ? AlertTriangle : Info;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLES[severity]}`}
    >
      <Icon size={12} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

/** Issues sorted by severity then by how many rows they affect. */
export function sortIssues(issues: ContentHealthIssue[]): ContentHealthIssue[] {
  return [...issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count,
  );
}

export function ReadinessList({ checks }: { checks: ReadinessCheck[] }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {checks.map((check) => (
        <li key={check.key} className="flex items-center gap-3 py-2.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              check.done ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}
            aria-hidden="true"
          >
            {check.done ? <Check size={14} /> : <X size={14} />}
          </span>
          <span className="flex-1 text-sm text-slate-700">
            {check.label}
            <span className="sr-only">{check.done ? " — đã đạt" : " — chưa đạt"}</span>
          </span>
          <span className="text-xs font-medium text-slate-500">{check.count.toLocaleString("vi-VN")}</span>
          <Link
            href={check.href}
            className="text-xs font-medium text-accent hover:underline focus:ring-2 focus:ring-accent/30 focus:outline-none"
          >
            Mở
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface IssueListProps {
  issues: ContentHealthIssue[];
  /** Show the sample ids of affected rows. */
  showSamples?: boolean;
  /** Render at most this many issues. */
  limit?: number;
}

export function IssueList({ issues, showSamples = false, limit }: IssueListProps) {
  const sorted = sortIssues(issues);
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {visible.map((issue) => {
        const route = issueRoute(issue);
        return (
          <li key={issue.code} className="flex flex-col gap-1.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={issue.severity} />
              <span className="text-sm font-medium text-slate-900">{issueLabel(issue.code)}</span>
              <span className="text-xs text-slate-400">{entityLabel(issue.entity)}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {issue.count.toLocaleString("vi-VN")}
              </span>
              {route && (
                <Link
                  href={route}
                  className="text-xs font-medium text-accent hover:underline focus:ring-2 focus:ring-accent/30 focus:outline-none"
                >
                  Xử lý
                </Link>
              )}
            </div>
            {showSamples && issue.sampleIds.length > 0 && (
              <p className="text-xs break-all text-slate-400">
                Ví dụ: {issue.sampleIds.join(", ")}
                {issue.count > issue.sampleIds.length && " …"}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
