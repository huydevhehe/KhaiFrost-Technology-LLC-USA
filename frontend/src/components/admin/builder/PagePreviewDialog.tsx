"use client";

import { useEffect, useState } from "react";
import { Modal, LOCALES, LOCALE_LABELS, type Locale } from "@/components/admin/shared";
import { isApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errorMessages";
import { pagesApi, type PagePreview, type SectionTypeDefinition } from "@/lib/api/admin/pages";
import { ActionButton } from "./controls";

function isMediaValue(value: unknown): value is { url: string; alt: string | null } {
  return typeof value === "object" && value !== null && typeof (value as { url?: unknown }).url === "string";
}

function PreviewValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  if (isMediaValue(value)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary uploaded asset url */}
        <img
          src={value.url}
          alt={value.alt ?? ""}
          className="max-h-40 w-auto rounded-lg border border-slate-200 object-cover"
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <ul className="flex flex-col gap-2">
          {value.map((item, index) => (
            <li key={index} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              {typeof item === "object" && item !== null ? (
                <div className="flex flex-col gap-1.5">
                  {Object.entries(item as Record<string, unknown>)
                    .filter(([key]) => key !== "id")
                    .map(([key, entry]) => (
                      <PreviewValue key={key} label={key} value={entry} />
                    ))}
                </div>
              ) : (
                <span className="text-sm text-slate-700">{String(item)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <p className="text-sm text-slate-700">
        <span className="text-xs font-medium text-slate-400">{label}: </span>
        {value ? "Có" : "Không"}
      </p>
    );
  }

  const text = String(value);
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(text);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {looksLikeHtml ? (
        <div
          className="prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ) : (
        <p className="text-sm whitespace-pre-line text-slate-700">{text}</p>
      )}
    </div>
  );
}

export interface PagePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  pageId: string;
  sectionTypes: Record<string, SectionTypeDefinition>;
}

/** Readable preview of the resolved draft content for one locale. */
export function PagePreviewDialog({ open, onClose, pageId, sectionTypes }: PagePreviewDialogProps) {
  const [locale, setLocale] = useState<Locale>("vi");
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await pagesApi.preview(pageId, locale, controller.signal);
        if (!cancelled) setPreview(result);
      } catch (caught) {
        if (cancelled || (isApiError(caught) && caught.code === "ABORTED")) return;
        setError(describeApiError(caught));
        setPreview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, pageId, locale]);

  const labelFor = (key: string, type: string): string => {
    const definition = sectionTypes[type];
    const field = definition?.fields.find((item) => item.key === key);
    return field?.label.vi ?? key;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xem trước nội dung nháp"
      description="Bản nháp hiện tại được hiển thị dưới dạng văn bản, không theo giao diện thật của website."
      size="lg"
      footer={<ActionButton onClick={onClose}>Đóng</ActionButton>}
    >
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Ngôn ngữ xem trước" className="flex gap-1 border-b border-slate-200">
          {LOCALES.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={item === locale}
              onClick={() => setLocale(item)}
              className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${
                item === locale
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {LOCALE_LABELS[item]}
            </button>
          ))}
        </div>

        {loading && <p className="py-6 text-center text-sm text-slate-500">Đang tải bản xem trước…</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {preview && !loading && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="font-mono text-xs text-slate-500">{preview.path}</p>
              <p className="text-base font-semibold text-slate-900">
                {preview.title ?? "(chưa có tiêu đề)"}
              </p>
            </div>
            {preview.sections.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Chưa có section nào đang hiển thị.
              </p>
            ) : (
              preview.sections.map((section) => (
                <section key={section.key} className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {sectionTypes[section.type]?.label.vi ?? section.type} · {section.key}
                  </p>
                  <div className="flex flex-col gap-3">
                    {Object.entries(section.content).map(([key, value]) => (
                      <PreviewValue key={key} label={labelFor(key, section.type)} value={value} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
