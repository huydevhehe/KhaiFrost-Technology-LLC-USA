"use client";

import { useMemo, useState } from "react";
import { HeartPulse, RotateCcw } from "lucide-react";
import { Panel, Select } from "@/components/admin/ui";
import { EmptyState, ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import { IssueList, ReadinessList, SeverityChip, sortIssues } from "@/components/admin/system/ContentHealth";
import { formatDateTime } from "@/lib/format";
import {
  SEVERITY_LABELS,
  readinessChecks,
  type ContentHealthReport,
  type IssueSeverity,
} from "@/lib/api/admin/contentHealth";

const SEVERITIES: IssueSeverity[] = ["critical", "warning", "info"];

export default function AdminContentHealthPage() {
  const { data, loading, error, refetch } = useApiResource<ContentHealthReport>("/admin/content-health");
  const [severity, setSeverity] = useState<IssueSeverity | "all">("all");

  const counts = useMemo(() => {
    const result: Record<IssueSeverity, number> = { critical: 0, warning: 0, info: 0 };
    for (const issue of data?.issues ?? []) result[issue.severity] += 1;
    return result;
  }, [data]);

  const filtered = useMemo(() => {
    const issues = data?.issues ?? [];
    return sortIssues(severity === "all" ? issues : issues.filter((item) => item.severity === severity));
  }, [data, severity]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <HeartPulse size={22} className="text-accent" />
            Kiểm tra nội dung
          </h1>
          <p className="text-sm text-slate-500">
            Danh sách kiểm tra trước khi xuất bản và các vấn đề nội dung cần xử lý.
            {data && <span className="text-slate-400"> Cập nhật lúc {formatDateTime(data.generatedAt)}.</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
        >
          <RotateCcw size={15} />
          Kiểm tra lại
        </button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} retryLabel="Tải lại" />
      ) : loading && !data ? (
        <Panel>
          <TableSkeleton rows={6} columns={3} />
        </Panel>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel title="Sẵn sàng xuất bản">
            <ReadinessList checks={readinessChecks(data)} />
          </Panel>

          <Panel title="Tổng hợp vấn đề" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SEVERITIES.map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 px-3.5 py-3">
                  <SeverityChip severity={item} />
                  <p className="mt-2 text-2xl font-bold text-slate-900">{counts[item]}</p>
                  <p className="text-xs text-slate-500">nhóm vấn đề</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Danh sách vấn đề"
            className="xl:col-span-3"
            action={
              <Select
                className="w-44"
                aria-label="Lọc theo mức độ"
                value={severity}
                onChange={(event) => setSeverity(event.target.value as IssueSeverity | "all")}
              >
                <option value="all">Tất cả mức độ</option>
                {SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {SEVERITY_LABELS[item]}
                  </option>
                ))}
              </Select>
            }
          >
            {filtered.length === 0 ? (
              <EmptyState
                title={data.issues.length === 0 ? "Nội dung đang ổn" : "Không có vấn đề ở mức độ này"}
                description={
                  data.issues.length === 0
                    ? "Không phát hiện vấn đề nào cần xử lý."
                    : "Hãy chọn mức độ khác để xem thêm."
                }
              />
            ) : (
              <IssueList issues={filtered} showSamples />
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
