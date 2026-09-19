"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  CLIENT_LOCATION_LIMITS,
  clientLocationsApi,
  type AdminClientLocation,
  type ClientLocationStatus,
} from "@/lib/api/admin/clientLocations";

const STATUS_LABELS: Record<ClientLocationStatus, string> = {
  published: "Đang hiển thị",
  hidden: "Đã ẩn",
};

interface FormState {
  name: string;
  x: string;
  y: string;
  latitude: string;
  longitude: string;
  status: ClientLocationStatus;
  avatar: MediaSelection | null;
  cover: MediaSelection | null;
  quoteVi: string;
  quoteEn: string;
  roleVi: string;
  roleEn: string;
  countryVi: string;
  countryEn: string;
}

function toSelection(
  id: string | null | undefined,
  url: string | null | undefined,
  name: string,
): MediaSelection | null {
  return id && url ? { id, url, thumbnailUrl: url, name } : null;
}

function toForm(item: AdminClientLocation | null): FormState {
  return {
    name: item?.name ?? "",
    x: String(item?.x ?? 50),
    y: String(item?.y ?? 50),
    latitude: item?.latitude === null || item?.latitude === undefined ? "" : String(item.latitude),
    longitude:
      item?.longitude === null || item?.longitude === undefined ? "" : String(item.longitude),
    status: item?.status ?? "hidden",
    avatar: toSelection(item?.avatarId, item?.avatarUrl, "Ảnh đại diện"),
    cover: toSelection(item?.coverImageId, item?.coverImageUrl, "Ảnh bìa"),
    quoteVi: item?.translations.vi?.quote ?? "",
    quoteEn: item?.translations.en?.quote ?? "",
    roleVi: item?.translations.vi?.role ?? "",
    roleEn: item?.translations.en?.role ?? "",
    countryVi: item?.translations.vi?.country ?? "",
    countryEn: item?.translations.en?.country ?? "",
  };
}

function inRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= min && number <= max;
}

/** World map on which a click sets the pin position as percentages. */
function MapPlacer({
  x,
  y,
  onPick,
  disabled,
}: {
  x: string;
  y: string;
  onPick: (x: number, y: number) => void;
  disabled: boolean;
}) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;
    const round = (value: number) => Math.min(100, Math.max(0, Math.round(value * 100) / 100));
    onPick(round(px), round(py));
  };
  const valid = inRange(x, 0, 100) && inRange(y, 0, 100);
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Nhấp vào bản đồ để chọn vị trí"
      onClick={handleClick}
      onKeyDown={(event) => {
        if (disabled || !valid) return;
        const step = event.shiftKey ? 5 : 1;
        const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
        const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
        if (dx === 0 && dy === 0) return;
        event.preventDefault();
        onPick(
          Math.min(100, Math.max(0, Number(x) + dx)),
          Math.min(100, Math.max(0, Number(y) + dy)),
        );
      }}
      className="relative aspect-2/1 w-full cursor-crosshair overflow-hidden rounded-lg bg-navy focus:ring-2 focus:ring-accent/40 focus:outline-none"
    >
      <Image
        src="/images/map/global-reach.jpg"
        alt=""
        fill
        sizes="640px"
        className="pointer-events-none object-cover"
      />
      {valid && (
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      )}
    </div>
  );
}

export default function AdminClientLocationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });

  const [status, setStatus] = useState("");
  const filters = useFilters({
    status: status || undefined,
    sortBy: "sortOrder",
    sortOrder: "ASC",
  });
  const list = useApiList<AdminClientLocation>("/admin/client-locations", {
    filters,
    pageSize: 50,
  });

  const canCreate = hasPermission(PERMISSIONS.CLIENT_LOCATION_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.CLIENT_LOCATION_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CLIENT_LOCATION_DELETE);
  const canReorder =
    canUpdate && !status && list.search.trim() === "" && list.meta.totalPages <= 1;

  const [editing, setEditing] = useState<AdminClientLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const open = creating || editing !== null;
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const startCreate = () => {
    setForm(toForm(null));
    setFormError(null);
    setFieldErrors({});
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (item: AdminClientLocation) => {
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
    if (!form.name.trim()) {
      setFormError("Vui lòng nhập tên khách hàng.");
      return;
    }
    if (!inRange(form.x, 0, 100) || !inRange(form.y, 0, 100)) {
      setFormError("Vị trí trên bản đồ (X, Y) phải nằm trong khoảng 0 đến 100.");
      return;
    }
    const hasLat = form.latitude.trim() !== "";
    const hasLng = form.longitude.trim() !== "";
    if (hasLat !== hasLng) {
      setFormError("Vĩ độ và kinh độ cần được nhập cùng nhau.");
      return;
    }
    if (hasLat && (!inRange(form.latitude, -90, 90) || !inRange(form.longitude, -180, 180))) {
      setFormError("Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180.");
      return;
    }
    const complete = [
      form.quoteVi,
      form.quoteEn,
      form.roleVi,
      form.roleEn,
      form.countryVi,
      form.countryEn,
    ].every((text) => text.trim());
    if (form.status === "published" && !complete) {
      setFormError(
        "Cần đủ nhận xét, chức danh và quốc gia bằng cả tiếng Việt và tiếng Anh để hiển thị công khai.",
      );
      return;
    }
    setFormError(null);
    setFieldErrors({});
    const payload = {
      name: form.name.trim(),
      x: Number(form.x),
      y: Number(form.y),
      latitude: hasLat ? Number(form.latitude) : null,
      longitude: hasLng ? Number(form.longitude) : null,
      status: form.status,
      avatarId: form.avatar?.id ?? null,
      coverImageId: form.cover?.id ?? null,
      translations: {
        vi: {
          quote: form.quoteVi.trim(),
          role: form.roleVi.trim(),
          country: form.countryVi.trim(),
        },
        en: {
          quote: form.quoteEn.trim(),
          role: form.roleEn.trim(),
          country: form.countryEn.trim(),
        },
      },
    };
    const result = await action.run(
      () =>
        editing
          ? clientLocationsApi.update(editing.id, { ...payload, version: editing.version })
          : clientLocationsApi.create(payload),
      {
        onError: (caught) => {
          setFormError(describeContentError(caught));
          setFieldErrors(contentFieldErrors(caught));
        },
      },
    );
    if (result) {
      toast.success(editing ? "Đã cập nhật vị trí khách hàng." : "Đã thêm vị trí khách hàng.");
      close();
      list.refetch();
    }
  };

  const remove = async (item: AdminClientLocation) => {
    const ok = await confirm({
      title: "Xoá vị trí khách hàng?",
      message: `“${item.name}” sẽ bị xoá khỏi bản đồ khách hàng.`,
      confirmLabel: "Xoá vị trí",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => clientLocationsApi.remove(item.id), {
      onError: (caught) => toast.error(describeContentError(caught)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá vị trí khách hàng.");
      list.refetch();
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= list.items.length) return;
    const ids = list.items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const done = await action.run(() => clientLocationsApi.reorder(ids), {
      onError: (caught) => toast.error(describeContentError(caught)),
    });
    if (done !== undefined) list.refetch();
  };

  const createButton = (
    <ActionButton variant="primary" icon={<Plus size={16} />} onClick={startCreate}>
      Thêm vị trí
    </ActionButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Bản đồ khách hàng</h1>
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
              placeholder="Tìm theo tên khách hàng…"
              aria-label="Tìm vị trí khách hàng"
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
            title="Chưa có vị trí khách hàng nào"
            description="Thêm vị trí đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<MapPin size={28} />}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách vị trí khách hàng</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Khách hàng
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Quốc gia (VI / EN)
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Vị trí
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
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <ImageThumb src={item.avatarUrl} alt="" size={40} rounded="full" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {item.translations.vi?.role || item.translations.en?.role || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {item.translations.vi?.country || "—"} / {item.translations.en?.country || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {item.x}% · {item.y}%
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
                            title="Xoá vị trí"
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
          <Pager meta={list.meta} onChange={list.setPage} noun="vị trí" disabled={list.loading} />
        )}
      </Panel>

      {open && (
        <Modal
          open
          onClose={close}
          size="md"
          title={editing ? "Chỉnh sửa vị trí khách hàng" : "Thêm vị trí khách hàng"}
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
            <Field label="Tên khách hàng" htmlFor="loc-name" required hint={fieldErrors.name}>
              <Input
                id="loc-name"
                value={form.name}
                maxLength={CLIENT_LOCATION_LIMITS.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Vị trí trên bản đồ <span className="text-red-500">*</span>
              </span>
              <MapPlacer
                x={form.x}
                y={form.y}
                disabled={false}
                onPick={(x, y) => setForm((current) => ({ ...current, x: String(x), y: String(y) }))}
              />
              <p className="text-xs text-slate-400">
                Nhấp vào bản đồ để đặt ghim, hoặc dùng phím mũi tên khi bản đồ đang được chọn.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="X (%)" htmlFor="loc-x" hint={fieldErrors.x}>
                  <Input
                    id="loc-x"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.x}
                    onChange={(event) => setField("x", event.target.value)}
                  />
                </Field>
                <Field label="Y (%)" htmlFor="loc-y" hint={fieldErrors.y}>
                  <Input
                    id="loc-y"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.y}
                    onChange={(event) => setField("y", event.target.value)}
                  />
                </Field>
                <Field label="Vĩ độ" htmlFor="loc-lat" hint={fieldErrors.latitude}>
                  <Input
                    id="loc-lat"
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    value={form.latitude}
                    onChange={(event) => setField("latitude", event.target.value)}
                  />
                </Field>
                <Field label="Kinh độ" htmlFor="loc-lng" hint={fieldErrors.longitude}>
                  <Input
                    id="loc-lng"
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={form.longitude}
                    onChange={(event) => setField("longitude", event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Chức danh (VI)" htmlFor="loc-role-vi" required>
                <Input
                  id="loc-role-vi"
                  value={form.roleVi}
                  maxLength={CLIENT_LOCATION_LIMITS.role}
                  onChange={(event) => setField("roleVi", event.target.value)}
                />
              </Field>
              <Field label="Chức danh (EN)" htmlFor="loc-role-en" required>
                <Input
                  id="loc-role-en"
                  value={form.roleEn}
                  maxLength={CLIENT_LOCATION_LIMITS.role}
                  onChange={(event) => setField("roleEn", event.target.value)}
                />
              </Field>
              <Field label="Quốc gia (VI)" htmlFor="loc-country-vi" required>
                <Input
                  id="loc-country-vi"
                  value={form.countryVi}
                  maxLength={CLIENT_LOCATION_LIMITS.country}
                  onChange={(event) => setField("countryVi", event.target.value)}
                />
              </Field>
              <Field label="Quốc gia (EN)" htmlFor="loc-country-en" required>
                <Input
                  id="loc-country-en"
                  value={form.countryEn}
                  maxLength={CLIENT_LOCATION_LIMITS.country}
                  onChange={(event) => setField("countryEn", event.target.value)}
                />
              </Field>
              <Field label="Nhận xét (VI)" htmlFor="loc-quote-vi" required>
                <Textarea
                  id="loc-quote-vi"
                  rows={4}
                  value={form.quoteVi}
                  maxLength={CLIENT_LOCATION_LIMITS.quote}
                  onChange={(event) => setField("quoteVi", event.target.value)}
                />
              </Field>
              <Field label="Nhận xét (EN)" htmlFor="loc-quote-en" required>
                <Textarea
                  id="loc-quote-en"
                  rows={4}
                  value={form.quoteEn}
                  maxLength={CLIENT_LOCATION_LIMITS.quote}
                  onChange={(event) => setField("quoteEn", event.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MediaPicker
                label="Ảnh đại diện"
                value={form.avatar}
                onChange={(selection) => setField("avatar", selection)}
                folder="ban-do-khach-hang"
                error={fieldErrors.avatarId}
              />
              <MediaPicker
                label="Ảnh bìa"
                value={form.cover}
                onChange={(selection) => setField("cover", selection)}
                folder="ban-do-khach-hang"
                error={fieldErrors.coverImageId}
              />
            </div>

            <Field
              label="Trạng thái"
              htmlFor="loc-status"
              hint="Chỉ vị trí đang hiển thị mới xuất hiện trên bản đồ công khai."
            >
              <Select
                id="loc-status"
                value={form.status}
                onChange={(event) => setField("status", event.target.value as ClientLocationStatus)}
              >
                <option value="hidden">Đã ẩn</option>
                <option value="published">Đang hiển thị</option>
              </Select>
            </Field>

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
