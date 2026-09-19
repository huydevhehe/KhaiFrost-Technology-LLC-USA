"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, FolderCog, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  ImageThumb,
  MissingLocalesBadge,
  PublicationBadge,
  TableSkeleton,
  formatDateTime,
  useApiList,
  useApiAction,
  useConfirm,
  useFilters,
  useToast,
} from "@/components/admin/shared";
import {
  ActionButton,
  Pager,
  RowIconButton,
  describeContentError,
} from "@/components/admin/content";
import { Input, Panel, Select } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { postsApi, type AdminPostListItem } from "@/lib/api/admin/posts";
import { postCategoriesApi, type AdminPostCategory } from "@/lib/api/admin/postCategories";

const STATUS_OPTIONS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "draft", label: "Bản nháp" },
  { value: "in_review", label: "Chờ duyệt" },
  { value: "published", label: "Đã xuất bản" },
  { value: "archived", label: "Lưu trữ" },
];

export default function AdminBlogPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });

  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featured, setFeatured] = useState("");
  const [missingLocale, setMissingLocale] = useState("");
  const [mine, setMine] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categories, setCategories] = useState<AdminPostCategory[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const list = await postCategoriesApi.list(controller.signal);
        if (!cancelled) setCategories(list);
      } catch {
        // The filter simply stays empty; the list itself reports its own errors.
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const filters = useFilters({
    status: status || undefined,
    categoryId: categoryId || undefined,
    isFeatured: featured === "" ? undefined : featured === "yes",
    missingLocale: missingLocale || undefined,
    authorId: mine ? (user?.id ?? undefined) : undefined,
    dateField: "updatedAt",
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
    locale: "vi",
  });

  const list = useApiList<AdminPostListItem>("/admin/posts", { filters, pageSize: 20 });
  const canCreate = hasPermission(PERMISSIONS.POST_CREATE);
  const canDelete = hasPermission(PERMISSIONS.POST_DELETE);

  const remove = async (post: AdminPostListItem) => {
    const ok = await confirm({
      title: "Xoá bài viết?",
      message: `“${post.title}” sẽ được chuyển vào thùng rác.`,
      confirmLabel: "Xoá bài viết",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => postsApi.remove(post.id), {
      onError: (error) => toast.error(describeContentError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá bài viết.");
      list.refetch();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý bài viết</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/blog/categories">
            <ActionButton variant="secondary" icon={<FolderCog size={16} />}>
              Danh mục
            </ActionButton>
          </Link>
          {canCreate && (
            <Link href="/admin/blog/new">
              <ActionButton variant="primary" icon={<Plus size={16} />}>
                Tạo bài mới
              </ActionButton>
            </Link>
          )}
        </div>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Tìm theo tiêu đề hoặc đường dẫn…"
              aria-label="Tìm bài viết"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="Lọc theo trạng thái"
            className="w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc theo danh mục"
            className="w-48"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Mọi danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.vi?.name ?? category.en?.name ?? category.slug}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc theo nổi bật"
            className="w-40"
            value={featured}
            onChange={(event) => setFeatured(event.target.value)}
          >
            <option value="">Nổi bật: tất cả</option>
            <option value="yes">Chỉ bài nổi bật</option>
            <option value="no">Không nổi bật</option>
          </Select>
          <Select
            aria-label="Lọc theo bản dịch thiếu"
            className="w-48"
            value={missingLocale}
            onChange={(event) => setMissingLocale(event.target.value)}
          >
            <option value="">Mọi bản dịch</option>
            <option value="vi">Thiếu tiếng Việt</option>
            <option value="en">Thiếu tiếng Anh</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => setMine(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
            />
            Bài của tôi
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Từ ngày
            <Input
              type="date"
              aria-label="Cập nhật từ ngày"
              className="w-40"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Đến ngày
            <Input
              type="date"
              aria-label="Cập nhật đến ngày"
              className="w-40"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={6} columns={5} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có bài viết nào"
            description="Tạo bài viết đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<FileText size={28} />}
            action={
              canCreate ? (
                <Link href="/admin/blog/new">
                  <ActionButton variant="primary" icon={<Plus size={16} />}>
                    Tạo bài mới
                  </ActionButton>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách bài viết</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Tiêu đề
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Tác giả
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Cập nhật
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((post) => (
                  <tr key={post.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <ImageThumb
                          src={post.coverThumbnailUrl}
                          alt=""
                          width={64}
                          height={48}
                          rounded="md"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/blog/${post.id}`}
                            className="font-medium text-slate-900 hover:text-accent"
                          >
                            {post.title}
                          </Link>
                          <p className="truncate text-xs text-slate-400">
                            {post.category?.name ?? "Chưa có danh mục"} · /{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PublicationBadge status={post.status} publishedAt={post.publishedAt} />
                        <MissingLocalesBadge locales={post.missingLocales} />
                        {post.isFeatured && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            Nổi bật
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{post.authorName}</td>
                    <td className="py-3 pr-4 text-slate-500">{formatDateTime(post.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/blog/${post.id}`}>
                          <RowIconButton title="Chỉnh sửa">
                            <Pencil size={15} />
                          </RowIconButton>
                        </Link>
                        {canDelete && (
                          <RowIconButton
                            title="Xoá bài viết"
                            tone="danger"
                            disabled={action.pending}
                            onClick={() => void remove(post)}
                          >
                            <Trash2 size={15} />
                          </RowIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list.items.length > 0 && (
          <Pager meta={list.meta} onChange={list.setPage} noun="bài viết" disabled={list.loading} />
        )}
      </Panel>
    </div>
  );
}
