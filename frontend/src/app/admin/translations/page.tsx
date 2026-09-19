"use client";

import { useCallback, useMemo, useState } from "react";
import { Languages, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import { Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  Modal,
  TableSkeleton,
  useApiAction,
  useApiList,
  useApiResource,
  useConfirm,
  useFilters,
} from "@/components/admin/shared";
import { ActionButton, Chip } from "@/components/admin/builder";
import { isApiError } from "@/lib/api/client";
import { getFieldErrors } from "@/lib/api/errorMessages";
import {
  DEFAULT_UI_NAMESPACE,
  UI_TRANSLATION_DESCRIPTION_MAX_LENGTH,
  UI_TRANSLATION_KEY_PATTERN,
  UI_TRANSLATION_NAMESPACE_PATTERN,
  UI_TRANSLATION_VALUE_MAX_LENGTH,
  placeholdersMatch,
  placeholdersOf,
  uiTranslationsApi,
  type MissingLocaleFilter,
  type UiTranslation,
  type UiTranslationNamespaceSummary,
} from "@/lib/api/admin/uiTranslations";
import { PERMISSIONS, type Locale } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

interface RowEdit {
  valueVi: string;
  valueEn: string;
}

const MISSING_OPTIONS: { value: "" | MissingLocaleFilter; label: string }[] = [
  { value: "", label: "Tất cả chuỗi" },
  { value: "any", label: "Thiếu bất kỳ ngôn ngữ nào" },
  { value: "vi", label: "Thiếu tiếng Việt" },
  { value: "en", label: "Thiếu tiếng Anh" },
];

export default function AdminTranslationsPage() {
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission(PERMISSIONS.UI_TRANSLATION_UPDATE);

  const [namespace, setNamespace] = useState("");
  const [missing, setMissing] = useState<"" | MissingLocaleFilter>("");
  const filters = useFilters({ namespace: namespace || undefined, missing: missing || undefined });
  const list = useApiList<UiTranslation>("/admin/ui-translations", { filters, pageSize: 25 });
  const namespaces = useApiResource<UiTranslationNamespaceSummary[]>(
    "/admin/ui-translations/namespaces",
  );

  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const rowAction = useApiAction();
  const deleteAction = useApiAction();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const valueOf = useCallback(
    (row: UiTranslation): RowEdit =>
      edits[row.id] ?? { valueVi: row.valueVi ?? "", valueEn: row.valueEn ?? "" },
    [edits],
  );

  const setValue = useCallback(
    (row: UiTranslation, changes: Partial<RowEdit>) => {
      setEdits((current) => ({
        ...current,
        [row.id]: { ...(current[row.id] ?? { valueVi: row.valueVi ?? "", valueEn: row.valueEn ?? "" }), ...changes },
      }));
    },
    [],
  );

  const isDirty = useCallback(
    (row: UiTranslation) => {
      const edit = edits[row.id];
      if (!edit) return false;
      return edit.valueVi !== (row.valueVi ?? "") || edit.valueEn !== (row.valueEn ?? "");
    },
    [edits],
  );

  const saveRow = useCallback(
    async (row: UiTranslation) => {
      const edit = valueOf(row);
      if (!placeholdersMatch(edit.valueVi, edit.valueEn)) return;
      setSavingId(row.id);
      const saved = await rowAction.run(
        () =>
          uiTranslationsApi.update(row.id, {
            version: row.version,
            valueVi: edit.valueVi,
            valueEn: edit.valueEn,
          }),
        { successMessage: "Đã lưu chuỗi." },
      );
      setSavingId(null);
      if (saved) {
        list.setItems((items) => items.map((item) => (item.id === saved.id ? saved : item)));
        setEdits((current) => {
          const next = { ...current };
          delete next[row.id];
          return next;
        });
        namespaces.refetch();
      }
    },
    [list, namespaces, rowAction, valueOf],
  );

  const deleteRow = useCallback(
    async (row: UiTranslation) => {
      const ok = await confirm({
        title: "Xoá chuỗi này?",
        message: `Chuỗi "${row.namespace}:${row.key}" sẽ bị xoá. Không thể hoàn tác.`,
        confirmLabel: "Xoá",
        danger: true,
      });
      if (!ok) return;
      const result = await deleteAction.run(() => uiTranslationsApi.remove(row.id), {
        successMessage: "Đã xoá chuỗi.",
      });
      if (result !== undefined) {
        list.refetch();
        namespaces.refetch();
      }
    },
    [confirm, deleteAction, list, namespaces],
  );

  const missingSummary = useMemo(() => {
    const rows = namespaces.data ?? [];
    return rows.reduce(
      (total, row) => ({
        vi: total.vi + row.missingVi,
        en: total.en + row.missingEn,
      }),
      { vi: 0, en: 0 },
    );
  }, [namespaces.data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Văn bản giao diện</h1>
          <p className="mt-1 text-sm text-slate-500">
            Các chuỗi cố định của website (nút, nhãn, thông báo) theo tiếng Việt và tiếng Anh.
          </p>
        </div>
        {canUpdate && (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
              Nhập từ JSON
            </ActionButton>
            <ActionButton tone="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
              Thêm chuỗi
            </ActionButton>
          </div>
        )}
      </div>

      {(missingSummary.vi > 0 || missingSummary.en > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
          <Languages size={16} />
          <span>
            Còn {missingSummary.vi} chuỗi thiếu tiếng Việt và {missingSummary.en} chuỗi thiếu tiếng Anh.
          </span>
          <button
            type="button"
            onClick={() => setMissing("any")}
            className="font-medium underline underline-offset-2"
          >
            Xem các chuỗi còn thiếu
          </button>
        </div>
      )}

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="ui-search" className="sr-only">
              Tìm chuỗi
            </label>
            <Input
              id="ui-search"
              type="search"
              className="pl-9"
              placeholder="Tìm theo khoá hoặc nội dung…"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ui-namespace" className="sr-only">
              Nhóm chuỗi
            </label>
            <Select
              id="ui-namespace"
              className="w-52"
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
            >
              <option value="">Tất cả nhóm</option>
              {(namespaces.data ?? []).map((item) => (
                <option key={item.namespace} value={item.namespace}>
                  {item.namespace} ({item.total})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="ui-missing" className="sr-only">
              Lọc theo bản dịch còn thiếu
            </label>
            <Select
              id="ui-missing"
              className="w-56"
              value={missing}
              onChange={(event) => setMissing(event.target.value as "" | MissingLocaleFilter)}
            >
              {MISSING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={6} columns={4} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={<Languages size={28} />}
            title="Không có chuỗi nào"
            description="Thử đổi từ khoá tìm kiếm hoặc bỏ bớt bộ lọc."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {list.items.map((row) => {
              const edit = valueOf(row);
              const dirty = isDirty(row);
              const mismatch = !placeholdersMatch(edit.valueVi, edit.valueEn);
              const placeholders = placeholdersOf(edit.valueVi);
              return (
                <div
                  key={row.id}
                  className={`rounded-lg border px-3.5 py-3 ${
                    mismatch ? "border-red-200 bg-red-50/40" : "border-slate-200"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-700">
                      {row.namespace}:{row.key}
                    </span>
                    {row.isSystem && <Chip tone="sky">Hệ thống</Chip>}
                    {row.missingLocales.length > 0 && (
                      <Chip tone="amber">
                        Thiếu: {row.missingLocales.map((locale) => locale.toUpperCase()).join(", ")}
                      </Chip>
                    )}
                    {placeholders.length > 0 && (
                      <Chip tone="slate">Biến: {placeholders.join(", ")}</Chip>
                    )}
                    {row.description && (
                      <span className="text-xs text-slate-400">{row.description}</span>
                    )}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <Field label="Tiếng Việt" htmlFor={`${row.id}-vi`}>
                      <Textarea
                        id={`${row.id}-vi`}
                        rows={2}
                        value={edit.valueVi}
                        maxLength={UI_TRANSLATION_VALUE_MAX_LENGTH}
                        disabled={!canUpdate}
                        onChange={(event) => setValue(row, { valueVi: event.target.value })}
                      />
                    </Field>
                    <Field label="English" htmlFor={`${row.id}-en`}>
                      <Textarea
                        id={`${row.id}-en`}
                        rows={2}
                        value={edit.valueEn}
                        maxLength={UI_TRANSLATION_VALUE_MAX_LENGTH}
                        disabled={!canUpdate}
                        onChange={(event) => setValue(row, { valueEn: event.target.value })}
                      />
                    </Field>
                  </div>

                  {mismatch && (
                    <p role="alert" className="mt-2 text-xs text-red-600">
                      Các biến {"{{...}}"} trong hai ngôn ngữ phải giống nhau.
                    </p>
                  )}

                  {canUpdate && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ActionButton
                        size="sm"
                        tone="primary"
                        icon={<Save size={13} />}
                        disabled={!dirty || mismatch}
                        pending={savingId === row.id && rowAction.pending}
                        onClick={() => void saveRow(row)}
                      >
                        Lưu
                      </ActionButton>
                      {dirty && (
                        <ActionButton
                          size="sm"
                          onClick={() =>
                            setEdits((current) => {
                              const next = { ...current };
                              delete next[row.id];
                              return next;
                            })
                          }
                        >
                          Huỷ
                        </ActionButton>
                      )}
                      {!row.isSystem && (
                        <ActionButton
                          size="sm"
                          tone="danger"
                          icon={<Trash2 size={13} />}
                          pending={deleteAction.pending}
                          onClick={() => void deleteRow(row)}
                        >
                          Xoá
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {list.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                <span>
                  Trang {list.meta.page}/{list.meta.totalPages} · {list.meta.total} chuỗi
                </span>
                <div className="flex items-center gap-2">
                  <ActionButton
                    size="sm"
                    disabled={list.page <= 1}
                    onClick={() => list.setPage(list.page - 1)}
                  >
                    Trang trước
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    disabled={list.page >= list.meta.totalPages}
                    onClick={() => list.setPage(list.page + 1)}
                  >
                    Trang sau
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {createOpen && (
        <CreateTranslationDialog
          namespaces={(namespaces.data ?? []).map((item) => item.namespace)}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            list.refetch();
            namespaces.refetch();
          }}
        />
      )}

      {importOpen && (
        <ImportBundleDialog
          onClose={() => setImportOpen(false)}
          onImported={() => {
            list.refetch();
            namespaces.refetch();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CreateTranslationDialog({
  namespaces,
  onClose,
  onCreated,
}: {
  namespaces: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const action = useApiAction();
  const [namespace, setNamespace] = useState(namespaces[0] ?? DEFAULT_UI_NAMESPACE);
  const [key, setKey] = useState("");
  const [valueVi, setValueVi] = useState("");
  const [valueEn, setValueEn] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useCallback(async () => {
    const found: Record<string, string> = {};
    if (!UI_TRANSLATION_NAMESPACE_PATTERN.test(namespace)) {
      found.namespace = "Nhóm chỉ gồm chữ, số, gạch ngang và gạch dưới.";
    }
    if (!UI_TRANSLATION_KEY_PATTERN.test(key)) {
      found.key = "Khoá gồm các đoạn chữ/số cách nhau bằng dấu chấm, ví dụ hero.headline.";
    }
    if (!placeholdersMatch(valueVi, valueEn)) {
      found.placeholders = "Các biến {{...}} trong hai ngôn ngữ phải giống nhau.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const created = await action.run(
      () =>
        uiTranslationsApi.create({
          namespace,
          key,
          valueVi: valueVi || null,
          valueEn: valueEn || null,
          description: description || null,
        }),
      {
        successMessage: "Đã thêm chuỗi mới.",
        onError: (error) => setErrors(getFieldErrors(error)),
      },
    );
    if (created) onCreated();
  }, [action, description, key, namespace, onCreated, valueEn, valueVi]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Thêm chuỗi giao diện"
      description="Khoá được dùng trong mã nguồn; nội dung hiển thị theo ngôn ngữ người dùng chọn."
      footer={
        <>
          <ActionButton onClick={onClose}>Huỷ</ActionButton>
          <ActionButton tone="primary" pending={action.pending} onClick={() => void submit()}>
            Thêm chuỗi
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nhóm (namespace)" required htmlFor="new-ui-namespace">
          <Input
            id="new-ui-namespace"
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
          />
          {errors.namespace && (
            <p role="alert" className="text-xs text-red-600">
              {errors.namespace}
            </p>
          )}
        </Field>
        <Field label="Khoá" required htmlFor="new-ui-key" hint="Ví dụ: header.cta.contact">
          <Input id="new-ui-key" value={key} onChange={(event) => setKey(event.target.value)} />
          {errors.key && (
            <p role="alert" className="text-xs text-red-600">
              {errors.key}
            </p>
          )}
        </Field>
        <Field label="Tiếng Việt" htmlFor="new-ui-vi">
          <Textarea
            id="new-ui-vi"
            rows={2}
            value={valueVi}
            maxLength={UI_TRANSLATION_VALUE_MAX_LENGTH}
            onChange={(event) => setValueVi(event.target.value)}
          />
        </Field>
        <Field label="English" htmlFor="new-ui-en">
          <Textarea
            id="new-ui-en"
            rows={2}
            value={valueEn}
            maxLength={UI_TRANSLATION_VALUE_MAX_LENGTH}
            onChange={(event) => setValueEn(event.target.value)}
          />
        </Field>
        {errors.placeholders && (
          <p role="alert" className="text-xs text-red-600">
            {errors.placeholders}
          </p>
        )}
        <Field label="Ghi chú" htmlFor="new-ui-description" hint="Chuỗi này xuất hiện ở đâu.">
          <Input
            id="new-ui-description"
            value={description}
            maxLength={UI_TRANSLATION_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function ImportBundleDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const action = useApiAction();
  const [locale, setLocale] = useState<Locale>("vi");
  const [namespace, setNamespace] = useState(DEFAULT_UI_NAMESPACE);
  const [overwrite, setOverwrite] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    conflicts: string[];
    placeholderMismatches: string[];
  } | null>(null);

  const readFile = useCallback(async (file: File) => {
    setError(null);
    setText(await file.text());
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setResult(null);
    let bundle: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      bundle = parsed as Record<string, unknown>;
    } catch {
      setError("Nội dung không phải JSON hợp lệ (phải là một đối tượng JSON).");
      return;
    }
    const imported = await action.run(
      () => uiTranslationsApi.importBundle({ locale, namespace, bundle, overwrite }),
      {
        successMessage: "Đã nhập tệp ngôn ngữ.",
        onError: (caught) => {
          if (isApiError(caught) && caught.code === "VALIDATION_FAILED") {
            setError(caught.fieldErrors.map((item) => item.messages.join(", ")).join(" · "));
          }
        },
      },
    );
    if (imported) {
      setResult(imported);
      onImported();
    }
  }, [action, locale, namespace, onImported, overwrite, text]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Nhập tệp ngôn ngữ (JSON)"
      description="Tệp i18next lồng nhau cho MỘT nhóm chuỗi và MỘT ngôn ngữ."
      size="lg"
      footer={
        <>
          <ActionButton onClick={onClose}>Đóng</ActionButton>
          <ActionButton
            tone="primary"
            icon={<Upload size={15} />}
            pending={action.pending}
            disabled={text.trim() === ""}
            onClick={() => void submit()}
          >
            Nhập
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ngôn ngữ của tệp" htmlFor="import-locale">
            <Select
              id="import-locale"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="Nhóm (namespace)" htmlFor="import-namespace">
            <Input
              id="import-namespace"
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
            />
          </Field>
        </div>

        <label className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(event) => setOverwrite(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-2 focus:ring-accent/30"
          />
          Ghi đè các chuỗi đã có nội dung
        </label>

        <Field label="Tệp JSON" htmlFor="import-file">
          <input
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </Field>

        <Field label="Hoặc dán nội dung JSON" htmlFor="import-text">
          <Textarea
            id="import-text"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'{\n  "header": { "home": "Trang chủ" }\n}'}
            className="font-mono text-xs"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>
              Thêm mới {result.created} · Cập nhật {result.updated} · Bỏ qua {result.skipped}
            </p>
            {result.conflicts.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Trùng cấu trúc khoá: {result.conflicts.slice(0, 5).join(", ")}
                {result.conflicts.length > 5 ? "…" : ""}
              </p>
            )}
            {result.placeholderMismatches.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Lệch biến {"{{...}}"}: {result.placeholderMismatches.slice(0, 5).join(", ")}
                {result.placeholderMismatches.length > 5 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
