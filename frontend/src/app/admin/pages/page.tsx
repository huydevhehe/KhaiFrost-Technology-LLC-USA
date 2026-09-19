"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileStack, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Field, Input, Panel, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  Modal,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiList,
  useConfirm,
  useFilters,
} from "@/components/admin/shared";
import { ActionButton, Chip } from "@/components/admin/builder";
import {
  PAGE_TITLE_MAX_LENGTH,
  describePagePathProblem,
  pagesApi,
  type PageStatus,
  type PageSummary,
} from "@/lib/api/admin/pages";
import { getFieldErrors } from "@/lib/api/errorMessages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const STATUS_OPTIONS: { value: "" | PageStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

function StatusCell({ page }: { page: PageSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {page.status === "published" ? (
        <Chip tone="emerald">Đã xuất bản</Chip>
      ) : (
        <Chip tone="slate">Chưa xuất bản</Chip>
      )}
      {page.hasUnpublishedChanges && <Chip tone="amber">Có thay đổi chưa xuất bản</Chip>}
    </div>
  );
}

export default function AdminPagesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission(PERMISSIONS.PAGE_UPDATE);
  const canPublish = hasPermission(PERMISSIONS.PAGE_PUBLISH);

  const [status, setStatus] = useState<"" | PageStatus>("");
  const filters = useFilters({ status: status || undefined });
  const list = useApiList<PageSummary>("/admin/pages", { filters, pageSize: 50 });

  const [createOpen, setCreateOpen] = useState(false);
  const [path, setPath] = useState("/");
  const [titleVi, setTitleVi] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const createAction = useApiAction();
  const deleteAction = useApiAction();

  const pathProblem = useMemo(() => describePagePathProblem(path.trim()), [path]);

  const resetForm = useCallback(() => {
    setPath("/");
    setTitleVi("");
    setTitleEn("");
    setFormErrors({});
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedPath = path.trim();
    const problems: Record<string, string> = {};
    const problem = describePagePathProblem(trimmedPath);
    if (problem) problems.path = problem;
    if (!titleVi.trim()) problems["translations.vi.title"] = "Nhập tiêu đề tiếng Việt.";
    setFormErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const created = await createAction.run(
      () =>
        pagesApi.create({
          path: trimmedPath,
          translations: {
            vi: { title: titleVi.trim() },
            ...(titleEn.trim() ? { en: { title: titleEn.trim() } } : {}),
          },
        }),
      {
        successMessage: "Đã tạo trang mới.",
        onError: (error) => setFormErrors(getFieldErrors(error)),
      },
    );
    if (created) {
      setCreateOpen(false);
      resetForm();
      router.push(`/admin/pages/${created.id}`);
    }
  }, [createAction, path, resetForm, router, titleEn, titleVi]);

  const handleDelete = useCallback(
    async (page: PageSummary) => {
      const ok = await confirm({
        title: "Xoá trang này?",
        message: `Trang "${page.title.vi ?? page.path}" và toàn bộ section của nó sẽ bị xoá. Không thể hoàn tác.`,
        confirmLabel: "Xoá trang",
        danger: true,
      });
      if (!ok) return;
      const result = await deleteAction.run(() => pagesApi.remove(page.id), {
        successMessage: "Đã xoá trang.",
      });
      if (result !== undefined) list.refetch();
    },
    [confirm, deleteAction, list],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chỉnh sửa trang</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chọn một trang để sửa nội dung từng section, tiêu đề và SEO.
          </p>
        </div>
        {canUpdate && (
          <ActionButton tone="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Tạo trang mới
          </ActionButton>
        )}
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="page-search" className="sr-only">
              Tìm trang
            </label>
            <Input
              id="page-search"
              type="search"
              className="pl-9"
              placeholder="Tìm theo đường dẫn hoặc tiêu đề…"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="page-status" className="sr-only">
              Lọc theo trạng thái
            </label>
            <Select
              id="page-status"
              className="w-52"
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | PageStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={5} columns={5} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={<FileStack size={28} />}
            title="Chưa có trang nào"
            description="Tạo trang mới hoặc bỏ bớt bộ lọc để xem các trang hiện có."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th className="py-3 pr-4 font-medium">Trang</th>
                  <th className="py-3 pr-4 font-medium">Đường dẫn</th>
                  <th className="py-3 pr-4 font-medium">Trạng thái</th>
                  <th className="py-3 pr-4 font-medium">Section</th>
                  <th className="py-3 pr-4 font-medium">Cập nhật</th>
                  <th className="py-3 pr-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((page) => (
                  <tr key={page.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/pages/${page.id}`}
                        className="font-medium text-slate-900 hover:text-accent"
                      >
                        {page.title.vi ?? page.title.en ?? "(chưa có tiêu đề)"}
                      </Link>
                      {page.isSystem && (
                        <span className="ml-2 align-middle">
                          <Chip tone="sky" title="Trang mặc định của website, không thể xoá">
                            Hệ thống
                          </Chip>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500">{page.path}</td>
                    <td className="py-3 pr-4">
                      <StatusCell page={page} />
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{page.sectionCount}</td>
                    <td className="py-3 pr-4 text-slate-500">{formatDateTime(page.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/pages/${page.id}`}
                          aria-label={`Chỉnh sửa ${page.path}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil size={15} />
                        </Link>
                        {canPublish && !page.isSystem && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(page)}
                            disabled={deleteAction.pending}
                            aria-label={`Xoá ${page.path}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        title="Tạo trang mới"
        description="Trang mới được tạo ở dạng nháp; thêm section rồi xuất bản khi sẵn sàng."
        footer={
          <>
            <ActionButton
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              Huỷ
            </ActionButton>
            <ActionButton
              tone="primary"
              pending={createAction.pending}
              onClick={() => void handleCreate()}
            >
              Tạo trang
            </ActionButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Đường dẫn"
            required
            htmlFor="new-page-path"
            hint="Ví dụ: /gioi-thieu hoặc /dich-vu/ai."
          >
            <Input
              id="new-page-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/duong-dan"
            />
            {(formErrors.path || (path.trim() !== "/" && pathProblem)) && (
              <p role="alert" className="text-xs text-red-600">
                {formErrors.path ?? pathProblem}
              </p>
            )}
          </Field>
          <Field label="Tiêu đề (Tiếng Việt)" required htmlFor="new-page-title-vi">
            <Input
              id="new-page-title-vi"
              value={titleVi}
              maxLength={PAGE_TITLE_MAX_LENGTH}
              onChange={(event) => setTitleVi(event.target.value)}
            />
            {formErrors["translations.vi.title"] && (
              <p role="alert" className="text-xs text-red-600">
                {formErrors["translations.vi.title"]}
              </p>
            )}
          </Field>
          <Field
            label="Tiêu đề (English)"
            htmlFor="new-page-title-en"
            hint="Có thể bổ sung sau, nhưng cần đủ hai ngôn ngữ trước khi xuất bản."
          >
            <Input
              id="new-page-title-en"
              value={titleEn}
              maxLength={PAGE_TITLE_MAX_LENGTH}
              onChange={(event) => setTitleEn(event.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
