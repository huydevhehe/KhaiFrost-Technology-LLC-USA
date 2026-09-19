"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Search, UploadCloud, X } from "lucide-react";
import { Input, Panel, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  ImageThumb,
  TableSkeleton,
  formatBytes,
  formatDate,
  useApiList,
  useFilters,
  useToast,
} from "@/components/admin/shared";
import { Pager } from "@/components/admin/system/Pager";
import { MediaDetailModal } from "@/components/admin/system/MediaDetailModal";
import {
  MEDIA_MAX_FILES_PER_UPLOAD,
  describeMediaError,
  mediaAcceptAttribute,
  mediaApi,
  type MediaAsset,
  type MediaKind,
  type MediaSort,
  type MediaUploadResult,
} from "@/lib/api/admin/media";
import { describeApiError } from "@/lib/api/errorMessages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 24;

const SORT_LABELS: Record<MediaSort, string> = {
  newest: "Mới nhất",
  oldest: "Cũ nhất",
  name: "Tên A-Z",
  size: "Dung lượng",
};

export default function AdminMediaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sort, setSort] = useState<MediaSort>("newest");
  const [type, setType] = useState<MediaKind | "">("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<MediaUploadResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canUpload = !!user?.permissions.includes(PERMISSIONS.MEDIA_UPLOAD);

  const filters = useFilters({ sort, type: type || undefined });
  const list = useApiList<MediaAsset>("/admin/media", {
    pageSize: PAGE_SIZE,
    filters,
    keepPreviousData: true,
  });

  async function upload(files: FileList | File[] | null) {
    if (!files || uploading) return;
    const selection = Array.from(files);
    if (selection.length === 0) return;
    if (selection.length > MEDIA_MAX_FILES_PER_UPLOAD) {
      toast.error(describeMediaError("MEDIA_TOO_MANY_FILES"));
      return;
    }
    setUploading(true);
    setResults([]);
    try {
      const response = await mediaApi.upload(selection);
      setResults(response.results);
      if (response.created > 0) toast.success(`Đã tải lên ${response.created} tệp.`);
      if (response.duplicates > 0) toast.info(`${response.duplicates} tệp đã có sẵn trong thư viện.`);
      if (response.rejected > 0) toast.error(`${response.rejected} tệp bị từ chối.`);
      list.refetch();
    } catch (error) {
      toast.error(describeApiError(error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thư viện media</h1>
        <p className="text-sm text-slate-500">Ảnh và tài liệu dùng chung cho toàn bộ website.</p>
      </div>

      {canUpload && (
        <Panel>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void upload(event.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
              dragOver ? "border-accent bg-accent/5" : "border-slate-300"
            }`}
          >
            <UploadCloud size={28} className="text-accent" />
            <p className="text-sm font-medium text-slate-700">Kéo thả tệp vào đây</p>
            <p className="text-xs text-slate-400">
              Tối đa {MEDIA_MAX_FILES_PER_UPLOAD} tệp mỗi lần. Chấp nhận JPEG, PNG, WebP, AVIF, GIF và PDF.
            </p>
            <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-within:ring-2 focus-within:ring-accent/30">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {uploading ? "Đang tải lên…" : "Chọn tệp từ máy"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={mediaAcceptAttribute("any")}
                disabled={uploading}
                onChange={(event) => void upload(event.target.files)}
                className="sr-only"
              />
            </label>
          </div>

          {results.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Kết quả tải lên</p>
                <button
                  type="button"
                  onClick={() => setResults([])}
                  aria-label="Đóng kết quả tải lên"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {results.map((result, index) => (
                  <li
                    key={`${result.originalName}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {result.status === "rejected" ? (
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2
                        size={16}
                        className={`mt-0.5 shrink-0 ${result.status === "created" ? "text-emerald-500" : "text-slate-400"}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{result.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {result.status === "created" && "Đã tải lên."}
                        {result.status === "duplicate" && "Tệp đã có sẵn trong thư viện (dùng lại bản cũ)."}
                        {result.status === "rejected" &&
                          describeMediaError(result.error?.code, result.error?.message)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="mediaSearch" className="sr-only">
              Tìm tệp theo tên
            </label>
            <Input
              id="mediaSearch"
              type="search"
              placeholder="Tìm tệp theo tên…"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <label htmlFor="mediaType" className="sr-only">
            Lọc theo loại tệp
          </label>
          <Select
            id="mediaType"
            className="w-40"
            value={type}
            onChange={(event) => setType(event.target.value as MediaKind | "")}
          >
            <option value="">Tất cả loại</option>
            <option value="image">Ảnh</option>
            <option value="pdf">PDF</option>
          </Select>
          <label htmlFor="mediaSort" className="sr-only">
            Sắp xếp
          </label>
          <Select
            id="mediaSort"
            className="w-40"
            value={sort}
            onChange={(event) => setSort(event.target.value as MediaSort)}
          >
            {(Object.keys(SORT_LABELS) as MediaSort[]).map((item) => (
              <option key={item} value={item}>
                {SORT_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>

        {list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} retryLabel="Tải lại" />
        ) : list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={4} columns={6} withHeader={false} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có tệp nào"
            description="Tải ảnh hoặc tài liệu lên để dùng cho bài viết, sản phẩm và trang."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {list.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  title={item.name}
                  className="group flex w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-accent/60 focus:ring-2 focus:ring-accent/30 focus:outline-none"
                >
                  <span className="flex aspect-square w-full items-center justify-center bg-slate-50">
                    <ImageThumb
                      src={item.thumbnailUrl}
                      alt={item.name}
                      kind={item.kind}
                      width="100%"
                      height="100%"
                      rounded="none"
                      className="h-full w-full border-0!"
                    />
                  </span>
                  <span className="flex flex-col gap-0.5 px-2 py-1.5">
                    <span className="truncate text-xs font-medium text-slate-700">{item.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatBytes(item.sizeBytes)} · {formatDate(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Pager
          page={list.page}
          totalPages={list.meta.totalPages}
          totalLabel={`Tổng: ${list.meta.total.toLocaleString("vi-VN")} tệp`}
          onChange={list.setPage}
          disabled={list.loading}
        />
      </Panel>

      <MediaDetailModal
        assetId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={list.refetch}
      />
    </div>
  );
}
