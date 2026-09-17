"use client";

import { useState } from "react";
import { Panel, Field, Input, Textarea, PrimaryButton } from "@/components/admin/ui";
import { mockPages, type AdminPage, type PageSection } from "@/content/admin/mockPages";

export default function AdminPagesPage() {
  const [pages, setPages] = useState<AdminPage[]>(mockPages);
  const [selectedPageId, setSelectedPageId] = useState(mockPages[0].id);
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? pages[0];

  const [selectedSectionId, setSelectedSectionId] = useState(selectedPage.sections[0].id);
  const selectedSection =
    selectedPage.sections.find((s) => s.id === selectedSectionId) ?? selectedPage.sections[0];

  const [heading, setHeading] = useState(selectedSection.heading);
  const [subheading, setSubheading] = useState(selectedSection.subheading);
  const [body, setBody] = useState(selectedSection.body);
  const [image, setImage] = useState(selectedSection.image);
  const [savedFlash, setSavedFlash] = useState(false);

  function selectPage(page: AdminPage) {
    setSelectedPageId(page.id);
    setSelectedSectionId(page.sections[0].id);
    setHeading(page.sections[0].heading);
    setSubheading(page.sections[0].subheading);
    setBody(page.sections[0].body);
    setImage(page.sections[0].image);
  }

  function selectSection(section: PageSection) {
    setSelectedSectionId(section.id);
    setHeading(section.heading);
    setSubheading(section.subheading);
    setBody(section.body);
    setImage(section.image);
  }

  function handleSave() {
    setPages((prev) =>
      prev.map((p) =>
        p.id !== selectedPageId
          ? p
          : {
              ...p,
              sections: p.sections.map((s) =>
                s.id === selectedSectionId ? { ...s, heading, subheading, body, image } : s
              ),
            }
      )
    );
    console.log("Section saved (mock)", { page: selectedPageId, section: selectedSectionId, heading, subheading, body, image });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Chỉnh sửa trang</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_320px]">
        <Panel title="Trang" className="h-fit">
          <ul className="flex flex-col gap-1">
            {pages.map((page) => (
              <li key={page.id}>
                <button
                  onClick={() => selectPage(page)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    page.id === selectedPageId ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {page.name}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Các section">
          <ul className="flex flex-col gap-1">
            {selectedPage.sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => selectSection(section)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    section.id === selectedSectionId
                      ? "bg-accent/10 text-accent"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {section.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Nội dung: {selectedSection.name}</p>
            <div className="flex flex-col gap-4">
              <Field label="Tiêu đề" htmlFor="heading">
                <Input id="heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
              </Field>
              <Field label="Tiêu đề phụ" htmlFor="subheading">
                <Input id="subheading" value={subheading} onChange={(e) => setSubheading(e.target.value)} />
              </Field>
              <Field label="Ảnh" htmlFor="image" hint="Đường dẫn ảnh, để trống nếu section không dùng ảnh.">
                <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/..." />
              </Field>
              <Field label="Nội dung" htmlFor="body">
                <Textarea id="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
              </Field>
              <PrimaryButton onClick={handleSave}>Lưu</PrimaryButton>
              {savedFlash && <p className="text-sm text-emerald-600">Đã lưu thay đổi (mock).</p>}
            </div>
          </div>
        </Panel>

        <Panel title="Xem trước" className="h-fit">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- lightweight live preview, avoids next/image config for arbitrary preview paths
              <img src={image} alt="" className="h-28 w-full bg-slate-100 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
            <div className="bg-navy p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-white/50">{subheading}</p>
              <p className="mt-1 text-lg font-bold leading-snug">{heading}</p>
              <p className="mt-2 text-xs text-white/70 line-clamp-3">{body}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
