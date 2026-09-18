"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Panel, Input, Select, Pagination } from "@/components/admin/ui";
import { mockAuditLog } from "@/content/admin/mockAuditLog";

const PAGE_SIZE = 6;

export default function AdminAuditLogPage() {
  const [query, setQuery] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [page, setPage] = useState(1);

  const actors = Array.from(new Set(mockAuditLog.map((l) => l.actor)));

  const filtered = mockAuditLog.filter((entry) => {
    const matchesQuery =
      entry.action.toLowerCase().includes(query.toLowerCase()) || entry.target.toLowerCase().includes(query.toLowerCase());
    const matchesActor = actorFilter === "all" || entry.actor === actorFilter;
    return matchesQuery && matchesActor;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nhật ký hoạt động</h1>
        <p className="text-sm text-slate-500">Nhật ký chỉ đọc — không thể chỉnh sửa hoặc xoá bản ghi.</p>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm hành động..."
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-52"
            value={actorFilter}
            onChange={(e) => {
              setActorFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả người dùng</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-3 pr-4 font-medium">Thời gian</th>
              <th className="py-3 pr-4 font-medium">Người thực hiện</th>
              <th className="py-3 pr-4 font-medium">Hành động</th>
              <th className="py-3 pr-4 font-medium">Đối tượng</th>
              <th className="py-3 pr-4 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageItems.map((entry) => (
              <tr key={entry.id} className="text-slate-700">
                <td className="py-3 pr-4 text-slate-500">{entry.timestamp}</td>
                <td className="py-3 pr-4 font-medium text-slate-900">{entry.actor}</td>
                <td className="py-3 pr-4 text-slate-500">{entry.action}</td>
                <td className="py-3 pr-4 text-slate-500">{entry.target}</td>
                <td className="py-3 pr-4 text-slate-400">{entry.ip}</td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  Không tìm thấy bản ghi phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination page={page} totalPages={totalPages} totalLabel={`Tổng: ${filtered.length} bản ghi`} onChange={setPage} />
      </Panel>
    </div>
  );
}
