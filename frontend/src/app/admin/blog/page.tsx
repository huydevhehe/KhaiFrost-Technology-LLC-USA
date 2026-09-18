"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Pencil, Trash2, Plus, Search } from "lucide-react";
import { Panel, Input, Select, PrimaryButton, IconButton, Pagination } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { mockBlogPosts, blogCategories, type AdminBlogPost } from "@/content/admin/mockBlogPosts";

const PAGE_SIZE = 5;

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>(mockBlogPosts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [posts, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý bài viết</h1>
        <Link href="/admin/blog/new">
          <PrimaryButton icon={<Plus size={16} />}>Tạo bài mới</PrimaryButton>
        </Link>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm bài viết..."
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
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả danh mục</option>
            {blogCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-medium">Tiêu đề</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 pr-4 font-medium">Ngày cập nhật</th>
                <th className="py-3 pr-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((post) => (
                <tr key={post.id} className="text-slate-700">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        <Image src={post.coverImage} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{post.title}</p>
                        <p className="text-xs text-slate-400">{post.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{post.updatedDate}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton title="Xem">
                        <Eye size={15} />
                      </IconButton>
                      <Link href={`/admin/blog/new?id=${post.id}`}>
                        <IconButton title="Chỉnh sửa">
                          <Pencil size={15} />
                        </IconButton>
                      </Link>
                      <IconButton title="Xoá" onClick={() => handleDelete(post.id)} className="hover:text-red-600">
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                    Không tìm thấy bài viết phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} totalLabel={`Tổng: ${filtered.length} bài viết`} onChange={setPage} />
      </Panel>
    </div>
  );
}
