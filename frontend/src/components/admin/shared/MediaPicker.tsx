"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  MEDIA_MAX_FILES_PER_UPLOAD,
  describeMediaError,
  mediaAcceptAttribute,
  mediaApi,
  type MediaAsset,
  type MediaUploadResult,
} from "@/lib/api/admin/media";
import { describeApiError } from "@/lib/api/errorMessages";
import { isApiError } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/types";
import { ImageThumb } from "./ImageThumb";
import { Modal } from "./Modal";
import { formatBytes } from "./format";
import type { MediaAccept, MediaSelection } from "./types";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

/** Narrows a media asset to what a form stores. */
export function toMediaSelection(asset: MediaAsset): MediaSelection {
  return { id: asset.id, url: asset.url, thumbnailUrl: asset.thumbnailUrl, name: asset.name };
}

function listType(accept: MediaAccept): "image" | "pdf" | undefined {
  return accept === "any" ? undefined : accept;
}

function nounFor(accept: MediaAccept): string {
  return accept === "image" ? "ảnh" : "tệp";
}

// ---------------------------------------------------------------------------
// Browser dialog
// ---------------------------------------------------------------------------

/**
 * Library + upload dialog. It is mounted only while open, so every open starts
 * from a clean state (no reset effect needed).
 */
export interface MediaBrowserProps {
  open: boolean;
  onClose: () => void;
  multiple: boolean;
  accept: MediaAccept;
  folder?: string;
  initialSelected: MediaSelection[];
  onConfirm: (selection: MediaSelection[]) => void;
  /** Cap for multi selection (remaining slots). */
  maxSelection?: number;
}

type BrowserTab = "library" | "upload";

export function MediaBrowser({
  open,
  onClose,
  multiple,
  accept,
  folder,
  initialSelected,
  onConfirm,
  maxSelection,
}: MediaBrowserProps) {
  const [tab, setTab] = useState<BrowserTab>("library");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaSelection[]>(initialSelected);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [results, setResults] = useState<MediaUploadResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchId = useId();
  const noun = nounFor(accept);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search, debouncedSearch]);

  const previousSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (previousSearch.current === debouncedSearch) return;
    previousSearch.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await mediaApi.list(
          { search: debouncedSearch, type: listType(accept), sort: "newest", page, pageSize: PAGE_SIZE },
          controller.signal,
        );
        if (cancelled) return;
        setItems((current) => (page === 1 ? result.items : [...current, ...result.items]));
        setMeta(result.meta);
      } catch (caught) {
        if (cancelled || (isApiError(caught) && caught.code === "ABORTED")) return;
        setError(describeApiError(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, debouncedSearch, page, accept, reloadToken]);

  const isSelected = useCallback(
    (id: string) => selected.some((item) => item.id === id),
    [selected],
  );

  const toggle = useCallback(
    (asset: MediaAsset) => {
      const selection = toMediaSelection(asset);
      setSelected((current) => {
        if (!multiple) return current[0]?.id === asset.id ? [] : [selection];
        if (current.some((item) => item.id === asset.id)) {
          return current.filter((item) => item.id !== asset.id);
        }
        if (maxSelection !== undefined && current.length >= maxSelection) return current;
        return [...current, selection];
      });
    },
    [multiple, maxSelection],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      const files = fileList ? Array.from(fileList) : [];
      if (files.length === 0) return;
      if (files.length > MEDIA_MAX_FILES_PER_UPLOAD) {
        setUploadError(`Mỗi lần chỉ tải lên tối đa ${MEDIA_MAX_FILES_PER_UPLOAD} tệp.`);
        return;
      }
      setUploading(true);
      setUploadError(null);
      try {
        const response = await mediaApi.upload(files, { folder });
        setResults(response.results);
        const usable = response.results.filter(
          (result) => result.asset && result.status !== "rejected",
        );
        if (usable.length > 0) {
          if (files.length === 1 && usable[0]?.asset) {
            const selection = toMediaSelection(usable[0].asset);
            setSelected((current) =>
              multiple
                ? current.some((item) => item.id === selection.id)
                  ? current
                  : [...current, selection]
                : [selection],
            );
          }
          setPage(1);
          setReloadToken((token) => token + 1);
        }
      } catch (caught) {
        setUploadError(
          isApiError(caught) ? describeMediaError(caught.code, caught.message) : describeApiError(caught),
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [folder, multiple],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFiles(event.target.files);
    },
    [handleFiles],
  );

  const hasMore = meta !== null && meta.page < meta.totalPages;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chọn ${noun}`}
      description={`Chọn từ thư viện hoặc tải ${noun} mới lên.`}
      size="lg"
      footer={
        <>
          <span className="mr-auto text-xs text-slate-500">
            {selected.length > 0 ? `Đã chọn ${selected.length} ${noun}` : `Chưa chọn ${noun} nào`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
          >
            Dùng {noun} đã chọn
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Nguồn media" className="mb-4 flex gap-1 border-b border-slate-200">
        {(
          [
            ["library", "Thư viện"],
            ["upload", "Tải lên"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${
              tab === key ? "border-accent text-accent" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <label htmlFor={searchId} className="sr-only">
              Tìm kiếm trong thư viện
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên tệp…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-3.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {items.length === 0 && !loading && !error ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Không tìm thấy {noun} nào.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((asset) => {
                const active = isSelected(asset.id);
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => toggle(asset)}
                      aria-pressed={active}
                      title={asset.name}
                      className={`group relative flex w-full flex-col overflow-hidden rounded-lg border text-left transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${
                        active ? "border-accent ring-2 ring-accent/30" : "border-slate-200 hover:border-accent/60"
                      }`}
                    >
                      <span className="flex aspect-square w-full items-center justify-center bg-slate-50">
                        <ImageThumb
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          kind={asset.kind}
                          width="100%"
                          height="100%"
                          rounded="none"
                          className="h-full w-full border-0!"
                        />
                      </span>
                      {active && (
                        <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                          <Check size={13} />
                        </span>
                      )}
                      <span className="truncate px-2 py-1.5 text-xs text-slate-600">{asset.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            {loading && (
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" />
                Đang tải…
              </span>
            )}
            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none"
              >
                Tải thêm
              </button>
            )}
            {!loading && meta && (
              <span className="text-xs text-slate-400">
                {items.length}/{meta.total} {noun}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
              dragOver ? "border-accent bg-accent/5" : "border-slate-300"
            }`}
          >
            <UploadCloud size={28} className="text-accent" />
            <p className="text-sm font-medium text-slate-700">Kéo thả tệp vào đây</p>
            <p className="text-xs text-slate-400">
              Tối đa {MEDIA_MAX_FILES_PER_UPLOAD} tệp mỗi lần. Chấp nhận JPEG, PNG, WebP, AVIF, GIF
              {accept === "image" ? "" : " và PDF"}.
            </p>
            <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-within:ring-2 focus-within:ring-accent/30">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {uploading ? "Đang tải lên…" : "Chọn tệp từ máy"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={mediaAcceptAttribute(accept)}
                onChange={onInputChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>
          </div>

          {uploadError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {uploadError}
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Kết quả tải lên">
              {results.map((result, index) => (
                <li
                  key={`${result.originalName}-${index}`}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  {result.asset ? (
                    <ImageThumb
                      src={result.asset.thumbnailUrl}
                      alt={result.asset.name}
                      kind={result.asset.kind}
                      size={40}
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                      <FileText size={16} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{result.originalName}</p>
                    <p
                      className={`text-xs ${
                        result.status === "created"
                          ? "text-emerald-600"
                          : result.status === "duplicate"
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {result.status === "created"
                        ? `Đã tải lên${result.asset ? ` · ${formatBytes(result.asset.sizeBytes)}` : ""}`
                        : result.status === "duplicate"
                          ? "Tệp đã có trong thư viện, dùng lại bản cũ."
                          : describeMediaError(result.error?.code, result.error?.message)}
                    </p>
                  </div>
                  {result.asset && (
                    <button
                      type="button"
                      onClick={() => {
                        if (result.asset) toggle(result.asset);
                      }}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 focus:ring-2 focus:ring-accent/30 focus:outline-none"
                    >
                      {isSelected(result.asset.id) ? "Bỏ chọn" : "Chọn"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Single picker
// ---------------------------------------------------------------------------

export interface MediaPickerProps {
  value: MediaSelection | null;
  onChange: (value: MediaSelection | null) => void;
  /** Which assets the dialog lists and the upload input accepts. Default "image". */
  accept?: MediaAccept;
  required?: boolean;
  /** Field label; pass null to render the control alone. */
  label?: string | null;
  hint?: string;
  /** Validation message shown under the control. */
  error?: string;
  disabled?: boolean;
  id?: string;
  /** Folder new uploads are filed under. */
  folder?: string;
  className?: string;
}

/** Controlled single media field: thumbnail plus "Chọn ảnh" / "Xoá ảnh". */
export function MediaPicker({
  value,
  onChange,
  accept = "image",
  required = false,
  label = "Ảnh",
  hint,
  error,
  disabled = false,
  id,
  folder,
  className = "",
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const noun = nounFor(accept);
  const initialSelected = value ? [value] : [];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label !== null && (
        <span id={`${controlId}-label`} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <div
        role="group"
        aria-labelledby={label !== null ? `${controlId}-label` : undefined}
        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
      >
        {value ? (
          <ImageThumb
            src={value.thumbnailUrl || value.url}
            alt={value.name}
            kind={accept === "pdf" ? "pdf" : "image"}
            size={64}
            rounded="lg"
          />
        ) : (
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-300">
            {accept === "pdf" ? <FileText size={20} /> : <ImageIcon size={20} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-700">
            {value ? value.name : `Chưa chọn ${noun}`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              id={controlId}
              onClick={() => setOpen(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
            >
              <ImageIcon size={14} />
              {value ? `Đổi ${noun}` : `Chọn ${noun}`}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50"
              >
                <Trash2 size={14} />
                Xoá {noun}
              </button>
            )}
          </div>
        </div>
      </div>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {open && (
        <MediaBrowser
          open
          onClose={() => setOpen(false)}
          multiple={false}
          accept={accept}
          folder={folder}
          initialSelected={initialSelected}
          onConfirm={(selection) => {
            onChange(selection[0] ?? null);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery picker
// ---------------------------------------------------------------------------

export interface MediaMultiPickerProps {
  value: MediaSelection[];
  onChange: (value: MediaSelection[]) => void;
  accept?: MediaAccept;
  required?: boolean;
  /** Maximum number of assets in the gallery. */
  max?: number;
  label?: string | null;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  folder?: string;
  className?: string;
}

/** Ordered gallery field: add from the library, reorder and remove. */
export function MediaMultiPicker({
  value,
  onChange,
  accept = "image",
  required = false,
  max,
  label = "Thư viện ảnh",
  hint,
  error,
  disabled = false,
  id,
  folder,
  className = "",
}: MediaMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const noun = nounFor(accept);
  const full = max !== undefined && value.length >= max;

  const move = useCallback(
    (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= value.length) return;
      const next = [...value];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label !== null && (
        <span id={`${controlId}-label`} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <div
        role="group"
        aria-labelledby={label !== null ? `${controlId}-label` : undefined}
        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
      >
        {value.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">Chưa có {noun} nào.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {value.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2"
              >
                <span className="w-5 shrink-0 text-center text-xs text-slate-400">{index + 1}</span>
                <ImageThumb
                  src={item.thumbnailUrl || item.url}
                  alt={item.name}
                  kind={accept === "pdf" ? "pdf" : "image"}
                  size={40}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.name}</span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={disabled || index === 0}
                  aria-label={`Di chuyển ${item.name} lên trên`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-30"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={disabled || index === value.length - 1}
                  aria-label={`Di chuyển ${item.name} xuống dưới`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-30"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((entry) => entry.id !== item.id))}
                  disabled={disabled}
                  aria-label={`Xoá ${item.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id={controlId}
            onClick={() => setOpen(true)}
            disabled={disabled || full}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
          >
            <ImageIcon size={14} />
            Thêm {noun}
          </button>
          {max !== undefined && (
            <span className="text-xs text-slate-400">
              {value.length}/{max}
            </span>
          )}
        </div>
      </div>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {open && (
        <MediaBrowser
          open
          onClose={() => setOpen(false)}
          multiple
          accept={accept}
          folder={folder}
          initialSelected={[]}
          maxSelection={max === undefined ? undefined : Math.max(0, max - value.length)}
          onConfirm={(selection) => {
            const existing = new Set(value.map((item) => item.id));
            const added = selection.filter((item) => !existing.has(item.id));
            const next = [...value, ...added];
            onChange(max === undefined ? next : next.slice(0, max));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
