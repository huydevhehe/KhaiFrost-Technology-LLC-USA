"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Panel, Field, Input, Select, Textarea, FakeToolbar, PrimaryButton, SecondaryButton, Toggle } from "@/components/admin/ui";
import { mockBlogPosts, blogCategories } from "@/content/admin/mockBlogPosts";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function BlogFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const existingPost = mockBlogPosts.find((p) => p.id === editingId);
  const isEditing = Boolean(existingPost);

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [slug, setSlug] = useState(existingPost?.slug ?? "");
  const [category, setCategory] = useState(existingPost?.category ?? blogCategories[0]);
  const [coverImage, setCoverImage] = useState(existingPost?.coverImage ?? "");
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [contentVi, setContentVi] = useState(existingPost?.contentVi ?? "");
  const [contentEn, setContentEn] = useState(existingPost?.contentEn ?? "");
  const [publishDate, setPublishDate] = useState("2025-06-18");
  const [published, setPublished] = useState(existingPost?.status === "Published");
  const [submitted, setSubmitted] = useState(false);

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCoverImage(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Blog post submitted (mock)", {
      title,
      slug,
      category,
      coverImage,
      contentVi,
      contentEn,
      publishDate,
      status: published ? "Published" : "Draft",
    });
    setSubmitted(true);
    setTimeout(() => router.push("/admin/blog"), 900);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setLang("vi")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${lang === "vi" ? "bg-accent text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${lang === "en" ? "bg-accent text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              English
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Tiêu đề" htmlFor="title" required>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!isEditing) setSlug(slugify(e.target.value));
                }}
                placeholder="Xu hướng AI trong sản xuất công nghiệp"
                required
              />
            </Field>
            <Field label="Slug" htmlFor="slug" required>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="xu-huong-ai" required />
            </Field>
            <Field label={`Nội dung bài viết (${lang === "vi" ? "Tiếng Việt" : "English"})`} htmlFor="content">
              <FakeToolbar />
              <Textarea
                id="content"
                rows={12}
                value={lang === "vi" ? contentVi : contentEn}
                onChange={(e) => (lang === "vi" ? setContentVi(e.target.value) : setContentEn(e.target.value))}
                placeholder="Nội dung bài viết..."
              />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Ảnh đại diện">
            <div className="flex flex-col gap-3">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- may be a blob: object URL from local upload mock
                <img src={coverImage} alt="" className="h-32 w-full rounded-lg bg-slate-100 object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
                  <UploadCloud size={24} />
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Tải ảnh lên
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
            </div>
          </Panel>

          <Panel title="Danh mục & trạng thái">
            <div className="flex flex-col gap-4">
              <Field label="Danh mục" htmlFor="category">
                <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {blogCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ngày xuất bản" htmlFor="publishDate">
                <Input id="publishDate" type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
              </Field>
              <Field label="Trạng thái">
                <Toggle checked={published} onChange={setPublished} labelOn="Published" labelOff="Draft" />
              </Field>
            </div>
          </Panel>

          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" className="flex-1 justify-center">
              Lưu
            </PrimaryButton>
            <SecondaryButton onClick={() => router.push("/admin/blog")}>Huỷ</SecondaryButton>
          </div>
          {submitted && <p className="text-sm text-emerald-600">Đã lưu (mock) — đang quay lại danh sách...</p>}
        </div>
      </form>
    </div>
  );
}

export default function BlogFormPage() {
  return (
    <Suspense fallback={null}>
      <BlogFormContent />
    </Suspense>
  );
}
