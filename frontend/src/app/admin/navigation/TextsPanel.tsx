"use client";

import { useCallback, useState } from "react";
import { Save } from "lucide-react";
import { Field, Panel, Textarea } from "@/components/admin/ui";
import { ErrorState, TableSkeleton, useApiAction, useApiList } from "@/components/admin/shared";
import { ActionButton } from "@/components/admin/builder";
import {
  UI_TRANSLATION_VALUE_MAX_LENGTH,
  placeholdersMatch,
  uiTranslationsApi,
  type UiTranslation,
} from "@/lib/api/admin/uiTranslations";

interface RowEdit {
  valueVi: string;
  valueEn: string;
}

function TranslationKeysPanel({
  title,
  description,
  searchPrefix,
  canUpdate,
}: {
  title: string;
  description: string;
  searchPrefix: string;
  canUpdate: boolean;
}) {
  const list = useApiList<UiTranslation>("/admin/ui-translations", {
    initialSearch: searchPrefix,
    pageSize: 50,
  });
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const rowAction = useApiAction();

  const valueOf = useCallback(
    (row: UiTranslation): RowEdit => edits[row.id] ?? { valueVi: row.valueVi ?? "", valueEn: row.valueEn ?? "" },
    [edits],
  );

  const setValue = useCallback((row: UiTranslation, changes: Partial<RowEdit>) => {
    setEdits((current) => ({
      ...current,
      [row.id]: { ...(current[row.id] ?? { valueVi: row.valueVi ?? "", valueEn: row.valueEn ?? "" }), ...changes },
    }));
  }, []);

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
        () => uiTranslationsApi.update(row.id, { version: row.version, valueVi: edit.valueVi, valueEn: edit.valueEn }),
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
      }
    },
    [list, rowAction, valueOf],
  );

  return (
    <Panel title={title}>
      <p className="-mt-2 mb-4 text-sm text-slate-500">{description}</p>
      {list.loading && list.items.length === 0 ? (
        <TableSkeleton rows={4} columns={2} withHeader={false} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <p className="text-sm text-slate-500">Không có chuỗi nào khớp.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.items.map((row) => {
            const edit = valueOf(row);
            const dirty = isDirty(row);
            const mismatch = !placeholdersMatch(edit.valueVi, edit.valueEn);
            return (
              <div
                key={row.id}
                className={`rounded-lg border px-3.5 py-3 ${mismatch ? "border-red-200 bg-red-50/40" : "border-slate-200"}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{row.key}</span>
                  {row.description && <span className="text-xs text-slate-400">{row.description}</span>}
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
                {canUpdate && dirty && (
                  <div className="mt-2 flex items-center gap-2">
                    <ActionButton
                      size="sm"
                      tone="primary"
                      icon={<Save size={13} />}
                      disabled={mismatch}
                      pending={savingId === row.id && rowAction.pending}
                      onClick={() => void saveRow(row)}
                    >
                      Lưu
                    </ActionButton>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function HeaderFooterTextsPanel({ canUpdate }: { canUpdate: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <TranslationKeysPanel
        title="Chữ trong menu đầu trang"
        description="Nhãn nút, chữ trong header (ví dụ nav.demo, nav.getStarted...)."
        searchPrefix="nav."
        canUpdate={canUpdate}
      />
      <TranslationKeysPanel
        title="Chữ trong footer"
        description="Mô tả công ty, bản quyền và các dòng chữ tĩnh ở chân trang."
        searchPrefix="footer."
        canUpdate={canUpdate}
      />
    </div>
  );
}
