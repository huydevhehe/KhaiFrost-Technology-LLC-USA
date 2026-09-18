"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Panel, Input, Select, Pagination } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { mockContacts, type AdminContact, type ContactStatus } from "@/content/admin/mockContacts";

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<AdminContact[]>(mockContacts);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const filtered = contacts.filter((c) => {
    const matchesQuery =
      c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function openContact(contact: AdminContact) {
    setSelectedId(contact.id);
    if (contact.status === "Mới") {
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, status: "Đã xem" } : c)));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Form liên hệ</h1>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className={selected ? "xl:col-span-2" : "xl:col-span-3"}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Tìm theo tên hoặc email..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select className="w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "all")}>
              <option value="all">Tất cả trạng thái</option>
              <option value="Mới">Mới</option>
              <option value="Đã xem">Đã xem</option>
              <option value="Đã phản hồi">Đã phản hồi</option>
            </Select>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-medium">Họ tên</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Nội dung</th>
                <th className="py-3 pr-4 font-medium">Ngày gửi</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openContact(c)}
                  className={`cursor-pointer text-slate-700 ${selectedId === c.id ? "bg-accent/5" : ""}`}
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{c.email}</td>
                  <td className="max-w-xs py-3 pr-4 text-slate-500">
                    <p className="truncate">{c.message}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{c.date}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Không tìm thấy liên hệ phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={1} totalPages={1} totalLabel={`Tổng: ${filtered.length} liên hệ`} onChange={() => {}} />
        </Panel>

        {selected && (
          <Panel
            title="Chi tiết liên hệ"
            action={
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            }
          >
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Họ tên</p>
                <p className="font-medium text-slate-900">{selected.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                <p className="text-slate-700">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Điện thoại</p>
                <p className="text-slate-700">{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Ngày gửi</p>
                <p className="text-slate-700">{selected.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Nội dung</p>
                <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{selected.message}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Trạng thái</p>
                <StatusBadge status={selected.status} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setContacts((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: "Đã phản hồi" } : c)));
                  console.log("Marked as replied (mock)", selected.id);
                }}
                className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Đánh dấu đã phản hồi
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
