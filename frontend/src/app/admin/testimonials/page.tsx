"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, MessageSquareQuote, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  ImageThumb,
  MediaPicker,
  Modal,
  TableSkeleton,
  useApiAction,
  useApiList,
  useConfirm,
  useFilters,
  useToast,
  type MediaSelection,
} from "@/components/admin/shared";
import {
  ActionButton,
  Pager,
  RowIconButton,
  contentFieldErrors,
  describeContentError,
} from "@/components/admin/content";
import { Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  TESTIMONIAL_LIMITS,
  testimonialsApi,
  type AdminTestimonial,
  type TestimonialStatus,
} from "@/lib/api/admin/testimonials";

const STATUS_LABELS: Record<TestimonialStatus, string> = {
  published: "Đang hiển thị",
  hidden: "Đã ẩn",
};

interface FormState {
  authorName: string;
  company: string;
  location: string;
  rating: string;
  status: TestimonialStatus;
  avatar: MediaSelection | null;
  quoteVi: string;
  quoteEn: string;
  roleVi: string;
  roleEn: string;
}

function toForm(item: AdminTestimonial | null): FormState {
  return {
    authorName: item?.authorName ?? "",
    company: item?.company ?? "",
    location: item?.location ?? "",
    rating: String(item?.rating ?? 5),
    status: item?.status ?? "hidden",
    avatar:
      item?.avatarId && item.avatarUrl
        ? { id: item.avatarId, url: item.avatarUrl, thumbnailUrl: item.avatarUrl, name: "Ảnh đại diện" }
        : null,
    quoteVi: item?.translations.vi?.quote ?? "",
    quoteEn: item?.translations.en?.quote ?? "",
    roleVi: item?.translations.vi?.authorRole ?? "",
    roleEn: item?.translations.en?.authorRole ?? "",
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={13}
          fill={index < rating ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function AdminTestimonialsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });

  const [status, setStatus] = useState("");
  const filters = useFilters({ status: status || undefined, sortBy: "sortOrder", sortOrder: "ASC" });
  const list = useApiList<AdminTestimonial>("/admin/testimonials", { filters, pageSize: 50 });

  const canCreate = hasPermission(PERMISSIONS.TESTIMONIAL_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.TESTIMONIAL_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.TESTIMONIAL_DELETE);

  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const open = creating || editing !== null;
  const canReorder =
    canUpdate && !status && list.search.trim() === "" && list.meta.totalPages <= 1;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const startCreate = () => {
    setForm(toForm(null));
    setFormError(null);
    setFieldErrors({});
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (item: AdminTestimonial) => {
    setForm(toForm(item));
    setFormError(null);
    setFieldErrors({});
    setCreating(false);
    setEditing(item);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
  };

  const submit = async () => {
    const rating = Number(form.rating);
    if (!form.authorName.trim()) {
      setFormError("Vui lòng nhập tên khách hàng.");
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setFormError("Đánh giá phải là số nguyên từ 1 đến 5.");
      return;
    }
    if (form.status === "published" && (!form.quoteVi.trim() || !form.quoteEn.trim())) {
      setFormError("Cần nội dung nhận xét cả tiếng Việt và tiếng Anh để hiển thị công khai.");
      return;
    }
    setFormError(null);
    setFieldErrors({});
    const payload = {
      authorName: form.authorName.trim(),
      company: form.company.trim() || null,
      location: form.location.trim() || null,
      rating,
      status: form.status,
      avatarId: form.avatar?.id ?? null,
      translations: {
        vi: { quote: form.quoteVi.trim(), authorRole: form.roleVi.trim() || null },
        en: { quote: form.quoteEn.trim(), authorRole: form.roleEn.trim() || null },
      },
    };
    const result = await action.run(
      () =>
        editing
          ? testimonialsApi.update(editing.id, { ...payload, version: editing.version })
          : testimonialsApi.create(payload),
      {
        onError: (caught) => {
          setFormError(describeContentError(caught));
          setFieldErrors(contentFieldErrors(caught));
        },
      },
    );
    if (result) {
      toast.success(editing ? "Đã cập nhật nhận xét." : "Đã thêm nhận xét.");
      close();
      list.refetch();
    }
  };

  const remove = async (item: AdminTestimonial) => {
    const ok = await confirm({
      title: "Xoá nhận xét?",
      message: `Nhận xét của “${item.authorName}” sẽ bị xoá khỏi trang công khai.`,
      confirmLabel: "Xoá nhận xét",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => testimonialsApi.remove(item.id), {
      onError: (caught) => toast.error(describeContentError(caught)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá nhận xét.");
      list.refetch();
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= list.items.length) return;
    const ids = list.items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const done = await action.run(() => testimonialsApi.reorder(ids), {
      onError: (caught) => toast.error(describeContentError(caught)),
    });
    if (done !== undefined) list.refetch();
  };

  const createButton = (
    <ActionButton variant="primary" icon={<Plus size={16} />} onClick={startCreate}>
      Thêm nhận xét
    </ActionButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Nhận xét khách hàng</h1>
        {canCreate && createButton}
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Tìm theo tên khách hàng hoặc công ty…"
              aria-label="Tìm nhận xét"
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
            <option value="">Mọi trạng thái</option>
            <option value="published">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </Select>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={5} columns={4} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có nhận xét nào"
            description="Thêm nhận xét đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<MessageSquareQuote size={28} />}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách nhận xét khách hàng</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Khách hàng
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Nhận xét
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((item, index) => (
                  <tr key={item.id} className="align-top text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <ImageThumb src={item.avatarUrl} alt="" size={40} rounded="full" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{item.authorName}</p>
                          <p className="truncate text-xs text-slate-400">
                            {[item.company, item.location].filter(Boolean).join(" · ") || "—"}
                          </p>
                          <Stars rating={item.rating} />
                        </div>
                      </div>
                    </td>
                    <td className="max-w-md py-3 pr-4">
                      <p className="line-clamp-2 text-slate-600">
                        {item.translations.vi?.quote || item.translations.en?.quote || "—"}
                      </p>
                      {(!item.translations.vi?.quote || !item.translations.en?.quote) && (
                        <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Thiếu bản {item.translations.vi?.quote ? "EN" : "VI"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.status === "published"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {canReorder && (
                          <>
                            <RowIconButton
                              title="Chuyển lên"
                              disabled={index === 0 || action.pending}
                              onClick={() => void move(index, -1)}
                            >
                              <ArrowUp size={15} />
                            </RowIconButton>
                            <RowIconButton
                              title="Chuyển xuống"
                              disabled={index === list.items.length - 1 || action.pending}
                              onClick={() => void move(index, 1)}
                            >
                              <ArrowDown size={15} />
                            </RowIconButton>
                          </>
                        )}
                        <RowIconButton
                          title="Chỉnh sửa"
                          disabled={!canUpdate}
                          onClick={() => startEdit(item)}
                        >
                          <Pencil size={15} />
                        </RowIconButton>
                        {canDelete && (
                          <RowIconButton
                            title="Xoá nhận xét"
                            tone="danger"
                            disabled={action.pending}
                            onClick={() => void remove(item)}
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
          <Pager meta={list.meta} onChange={list.setPage} noun="nhận xét" disabled={list.loading} />
        )}
      </Panel>

      {open && (
        <Modal
          open
          onClose={close}
          size="md"
          title={editing ? "Chỉnh sửa nhận xét" : "Thêm nhận xét"}
          footer={
            <>
              <ActionButton variant="secondary" onClick={close} disabled={action.pending}>
                Huỷ
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => void submit()}
                pending={action.pending}
              >
                Lưu
              </ActionButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên khách hàng" htmlFor="testi-author" required hint={fieldErrors.authorName}>
                <Input
                  id="testi-author"
                  value={form.authorName}
                  maxLength={TESTIMONIAL_LIMITS.authorName}
                  onChange={(event) => setField("authorName", event.target.value)}
                />
              </Field>
              <Field label="Công ty" htmlFor="testi-company">
                <Input
                  id="testi-company"
                  value={form.company}
                  maxLength={TESTIMONIAL_LIMITS.company}
                  onChange={(event) => setField("company", event.target.value)}
                />
              </Field>
              <Field label="Địa điểm" htmlFor="testi-location">
                <Input
                  id="testi-location"
                  value={form.location}
                  maxLength={TESTIMONIAL_LIMITS.location}
                  onChange={(event) => setField("location", event.target.value)}
                />
              </Field>
              <Field label="Đánh giá (1–5 sao)" htmlFor="testi-rating">
                <Select
                  id="testi-rating"
                  value={form.rating}
                  onChange={(event) => setField("rating", event.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} sao
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Chức danh (VI)" htmlFor="testi-role-vi">
                <Input
                  id="testi-role-vi"
                  value={form.roleVi}
                  maxLength={TESTIMONIAL_LIMITS.authorRole}
                  onChange={(event) => setField("roleVi", event.target.value)}
                />
              </Field>
              <Field label="Chức danh (EN)" htmlFor="testi-role-en">
                <Input
                  id="testi-role-en"
                  value={form.roleEn}
                  maxLength={TESTIMONIAL_LIMITS.authorRole}
                  onChange={(event) => setField("roleEn", event.target.value)}
                />
              </Field>
              <Field label="Nhận xét (VI)" htmlFor="testi-quote-vi" required>
                <Textarea
                  id="testi-quote-vi"
                  rows={4}
                  value={form.quoteVi}
                  maxLength={TESTIMONIAL_LIMITS.quote}
                  onChange={(event) => setField("quoteVi", event.target.value)}
                />
              </Field>
              <Field label="Nhận xét (EN)" htmlFor="testi-quote-en" required>
                <Textarea
                  id="testi-quote-en"
                  rows={4}
                  value={form.quoteEn}
                  maxLength={TESTIMONIAL_LIMITS.quote}
                  onChange={(event) => setField("quoteEn", event.target.value)}
                />
              </Field>
              <Field
                label="Trạng thái"
                htmlFor="testi-status"
                hint={
                  canUpdate
                    ? "Chỉ nhận xét đang hiển thị mới xuất hiện trên trang công khai."
                    : "Chỉ quản trị viên mới được hiển thị nhận xét công khai."
                }
              >
                <Select
                  id="testi-status"
                  value={form.status}
                  disabled={!canUpdate}
                  onChange={(event) => setField("status", event.target.value as TestimonialStatus)}
                >
                  <option value="hidden">Đã ẩn</option>
                  <option value="published">Đang hiển thị</option>
                </Select>
              </Field>
            </div>
            <MediaPicker
              label="Ảnh đại diện"
              value={form.avatar}
              onChange={(selection) => setField("avatar", selection)}
              folder="nhan-xet"
              error={fieldErrors.avatarId}
            />
            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
