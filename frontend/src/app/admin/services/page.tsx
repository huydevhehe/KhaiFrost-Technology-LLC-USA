"use client";

import { useState } from "react";
import { Pencil, Search, UploadCloud } from "lucide-react";
import { Panel, Field, Input, Select, Textarea, FakeToolbar, PrimaryButton, SecondaryButton } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { mockServices, serviceCategories, type AdminService } from "@/content/admin/mockServices";

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>(mockServices);
  const [selectedId, setSelectedId] = useState<string>(mockServices[0].id);
  const [query, setQuery] = useState("");
  const selected = services.find((s) => s.id === selectedId) ?? services[0];

  const [name, setName] = useState(selected.name);
  const [category, setCategory] = useState(selected.category);
  const [description, setDescription] = useState(selected.description);
  const [coverImage, setCoverImage] = useState(selected.coverImage);

  function selectService(service: AdminService) {
    setSelectedId(service.id);
    setName(service.name);
    setCategory(service.category);
    setDescription(service.description);
    setCoverImage(service.coverImage);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServices((prev) => prev.map((s) => (s.id === selectedId ? { ...s, name, category, description, coverImage } : s)));
    console.log("Service saved (mock)", { id: selectedId, name, category, description });
  }

  const filtered = services.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Quản lý dịch vụ</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Tìm dịch vụ..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select className="w-48" defaultValue="all">
              <option value="all">Tất cả danh mục</option>
              {serviceCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-medium">Tên dịch vụ</th>
                <th className="py-3 pr-4 font-medium">Danh mục</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 pr-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((service) => (
                <tr
                  key={service.id}
                  className={`cursor-pointer text-slate-700 ${service.id === selectedId ? "bg-accent/5" : ""}`}
                  onClick={() => selectService(service)}
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">{service.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{service.category}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={service.status} />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectService(service);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Chỉnh sửa dịch vụ">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Tên dịch vụ" htmlFor="serviceName" required>
              <Input id="serviceName" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Danh mục" htmlFor="serviceCategory">
              <Select id="serviceCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                {serviceCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mô tả">
              <FakeToolbar />
              <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả dịch vụ" />
            </Field>
            <Field label="Ảnh bìa / Icon">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- may be a blob: object URL from local upload mock */}
                <img src={coverImage} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 object-cover" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <UploadCloud size={15} />
                  Tải ảnh lên
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setCoverImage(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>
            </Field>
            <div className="flex gap-3">
              <PrimaryButton type="submit">Lưu</PrimaryButton>
              <SecondaryButton onClick={() => selectService(selected)}>Huỷ thay đổi</SecondaryButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
