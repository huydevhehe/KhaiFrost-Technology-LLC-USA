"use client";

import { useRef, useState } from "react";
import { Search, UploadCloud, Trash2 } from "lucide-react";
import { Panel, Input, Select } from "@/components/admin/ui";
import { mockMedia, type AdminMediaItem } from "@/content/admin/mockMedia";

export default function AdminMediaPage() {
  const [media, setMedia] = useState<AdminMediaItem[]>(mockMedia);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newItems: AdminMediaItem[] = Array.from(files).map((file, i) => ({
      id: `MED-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      name: file.name,
      uploadedDate: new Date().toLocaleDateString("vi-VN"),
      sizeKb: Math.round(file.size / 1024),
    }));
    setMedia((prev) => [...newItems, ...prev]);
  }

  function handleDelete(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered = media
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "newest" ? 0 : a.name.localeCompare(b.name)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Thư viện media</h1>

      <Panel>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
            isDragOver ? "border-accent bg-accent/5" : "border-slate-300 hover:border-accent"
          }`}
        >
          <UploadCloud size={28} className="text-accent" />
          <p className="text-sm font-medium text-slate-700">Kéo thả file vào đây</p>
          <p className="text-xs text-slate-400">hoặc bấm để chọn file từ máy tính</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Tìm file..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select className="w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="name">Tên A-Z</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- grid may contain local blob: object URLs from drag/drop uploads */}
              <img src={item.url} alt={item.name} className="h-28 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs font-medium text-slate-700">{item.name}</p>
                <p className="text-[11px] text-slate-400">{item.sizeKb} KB</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-400">Không tìm thấy file phù hợp.</p>
          )}
        </div>

        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">Tổng: {filtered.length} file</p>
      </Panel>
    </div>
  );
}
