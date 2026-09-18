"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Panel, Field, Input, Textarea, PrimaryButton } from "@/components/admin/ui";
import { mockSeoSettings, type PageSeo } from "@/content/admin/mockSeo";

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<PageSeo[]>(mockSeoSettings);
  const [selectedPageId, setSelectedPageId] = useState(mockSeoSettings[0].pageId);
  const selected = settings.find((s) => s.pageId === selectedPageId) ?? settings[0];

  const [title, setTitle] = useState(selected.title);
  const [metaDescription, setMetaDescription] = useState(selected.metaDescription);
  const [keywords, setKeywords] = useState(selected.keywords);
  const [ogImage, setOgImage] = useState(selected.ogImage);
  const [savedFlash, setSavedFlash] = useState(false);

  function selectPage(page: PageSeo) {
    setSelectedPageId(page.pageId);
    setTitle(page.title);
    setMetaDescription(page.metaDescription);
    setKeywords(page.keywords);
    setOgImage(page.ogImage);
  }

  function handleSave() {
    setSettings((prev) =>
      prev.map((s) => (s.pageId === selectedPageId ? { ...s, title, metaDescription, keywords, ogImage } : s))
    );
    console.log("SEO settings saved (mock)", { page: selectedPageId, title, metaDescription, keywords, ogImage });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Cài đặt SEO</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_360px]">
        <Panel title="Pages" className="h-fit">
          <ul className="flex flex-col gap-1">
            {settings.map((page) => (
              <li key={page.pageId}>
                <button
                  onClick={() => selectPage(page)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    page.pageId === selectedPageId ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {page.pageName}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Cài đặt SEO — ${selected.pageName}`}>
          <div className="flex flex-col gap-4">
            <Field label="Tiêu đề (Title)" htmlFor="seoTitle" hint={`${title.length}/60 ký tự khuyến nghị`}>
              <Input id="seoTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Mô tả (Description)" htmlFor="seoDescription" hint={`${metaDescription.length}/160 ký tự khuyến nghị`}>
              <Textarea id="seoDescription" rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
            </Field>
            <Field label="Từ khoá (Keywords)" htmlFor="seoKeywords" hint="Phân tách bằng dấu phẩy.">
              <Input id="seoKeywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </Field>
            <Field label="OG Image">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- may be a blob: object URL from local upload mock */}
                <img src={ogImage} alt="" className="h-16 w-28 rounded-lg bg-slate-100 object-cover" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <UploadCloud size={15} />
                  Tải ảnh lên
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setOgImage(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>
            </Field>
            <PrimaryButton onClick={handleSave} className="w-fit">
              Lưu
            </PrimaryButton>
            {savedFlash && <p className="text-sm text-emerald-600">Đã lưu cài đặt SEO (mock).</p>}
          </div>
        </Panel>

        <Panel title="Xem trước Google" className="h-fit">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="truncate text-xs text-slate-600">khaifrost.vn › {selected.pageId}</p>
            <p className="mt-1 truncate text-lg text-[#1a0dab] hover:underline">{title || "Tiêu đề trang"}</p>
            <p className="mt-1 text-sm text-[#4d5156]">{metaDescription || "Mô tả trang sẽ hiển thị ở đây."}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
