"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Unlock, Pencil, Plus, Search } from "lucide-react";
import { Panel, Input, Select, PrimaryButton, IconButton, Pagination } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { mockUsers, type AdminUser, type UserRole, type UserStatus } from "@/content/admin/mockUsers";

const PAGE_SIZE = 5;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesQuery =
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleLock(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: (u.status === "Active" ? "Locked" : "Active") as UserStatus } : u
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý tài khoản</h1>
        <Link href="/admin/users/new">
          <PrimaryButton icon={<Plus size={16} />}>Thêm người dùng</PrimaryButton>
        </Link>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm kiếm người dùng..."
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-48"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | "all");
              setPage(1);
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-medium">ID</th>
                <th className="py-3 pr-4 font-medium">Tên đăng nhập</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Vai trò</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 pr-4 font-medium">Ngày tạo</th>
                <th className="py-3 pr-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((u) => (
                <tr key={u.id} className="text-slate-700">
                  <td className="py-3 pr-4 text-slate-400">#{u.id.replace("USR-", "")}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                        {u.name
                          .split(" ")
                          .slice(-2)
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{u.email}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={u.role} />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{u.createdDate}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton title={u.status === "Active" ? "Khoá tài khoản" : "Mở khoá"} onClick={() => toggleLock(u.id)}>
                        {u.status === "Active" ? <Lock size={15} /> : <Unlock size={15} />}
                      </IconButton>
                      <Link href={`/admin/users/new?id=${u.id}`}>
                        <IconButton title="Chỉnh sửa">
                          <Pencil size={15} />
                        </IconButton>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} totalLabel={`Tổng: ${filtered.length} người dùng`} onChange={setPage} />
      </Panel>
    </div>
  );
}
