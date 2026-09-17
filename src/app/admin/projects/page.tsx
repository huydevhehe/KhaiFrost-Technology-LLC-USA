"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { Panel, Field, Input, Select, Textarea, PrimaryButton, SecondaryButton } from "@/components/admin/ui";
import { mockProjects, projectCategories, type AdminProject } from "@/content/admin/mockProjects";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>(mockProjects);
  const [selectedId, setSelectedId] = useState<string>(mockProjects[0].id);
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  const [title, setTitle] = useState(selected.title);
  const [description, setDescription] = useState(selected.description);
  const [category, setCategory] = useState(selected.category);

  function selectProject(project: AdminProject) {
    setSelectedId(project.id);
    setTitle(project.title);
    setDescription(project.description);
    setCategory(project.category);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProjects((prev) => prev.map((p) => (p.id === selectedId ? { ...p, title, description, category } : p)));
    console.log("Project saved (mock)", { id: selectedId, title, description, category });
  }

  function removeGalleryImage(index: number) {
    setProjects((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, gallery: p.gallery.filter((_, i) => i !== index) } : p))
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý dự án</h1>
        <PrimaryButton
          icon={<Plus size={16} />}
          onClick={() => {
            const newProject: AdminProject = {
              id: `PRJ-${Math.floor(Math.random() * 900 + 100)}`,
              title: "Dự án mới",
              description: "",
              category: projectCategories[0],
              thumbnail: "/images/placeholders/project-1.jpg",
              gallery: [],
            };
            setProjects((prev) => [newProject, ...prev]);
            selectProject(newProject);
          }}
        >
          Tạo dự án
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project)}
              className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-colors ${
                project.id === selectedId ? "border-accent ring-2 ring-accent/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="relative h-32 w-full bg-slate-100">
                <Image src={project.thumbnail} alt={project.title} fill className="object-cover" sizes="240px" />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {project.category}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Panel title="Chỉnh sửa dự án">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Tên dự án" htmlFor="projectTitle" required>
              <Input id="projectTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Danh mục" htmlFor="projectCategory">
              <Select id="projectCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                {projectCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mô tả" htmlFor="projectDescription">
              <Textarea
                id="projectDescription"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả dự án..."
              />
            </Field>
            <Field label="Thư viện ảnh (gallery)">
              <div className="flex flex-wrap gap-2">
                {selected.gallery.map((img, i) => (
                  <div key={img + i} className="relative h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                    <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-accent hover:text-accent">
                  <Plus size={18} />
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </Field>
            <div className="flex gap-3">
              <PrimaryButton type="submit">Lưu</PrimaryButton>
              <SecondaryButton onClick={() => selectProject(selected)}>Huỷ thay đổi</SecondaryButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
