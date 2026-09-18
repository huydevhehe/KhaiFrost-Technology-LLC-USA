"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
import { Panel, Field, Input, Textarea, PrimaryButton, SecondaryButton, IconButton, Pagination } from "@/components/admin/ui";
import { mockTestimonials, type AdminTestimonial } from "@/content/admin/mockTestimonials";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} fill={i < rating ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>(mockTestimonials);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [location, setLocation] = useState("");

  const filtered = testimonials.filter((t) => t.clientName.toLowerCase().includes(query.toLowerCase()));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newItem: AdminTestimonial = {
      id: `TST-${Math.floor(Math.random() * 900 + 100)}`,
      clientName,
      company,
      quote,
      rating,
      location,
      avatar: "/images/placeholders/testimonial-1.jpg",
    };
    setTestimonials((prev) => [newItem, ...prev]);
    console.log("Testimonial added (mock)", newItem);
    setClientName("");
    setCompany("");
    setQuote("");
    setRating(5);
    setLocation("");
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Testimonials & Khách hàng</h1>
        <PrimaryButton icon={<Plus size={16} />} onClick={() => setShowForm((v) => !v)}>
          Thêm testimonial
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Tìm khách hàng..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-medium">Khách hàng</th>
                <th className="py-3 pr-4 font-medium">Nội dung</th>
                <th className="py-3 pr-4 font-medium">Đánh giá</th>
                <th className="py-3 pr-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="text-slate-700">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-100">
                        <Image src={t.avatar} alt="" fill className="object-cover" sizes="36px" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{t.clientName}</p>
                        <p className="text-xs text-slate-400">{t.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-slate-500">
                    <p className="line-clamp-2">{t.quote}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Stars rating={t.rating} />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton title="Chỉnh sửa">
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton title="Xoá" onClick={() => handleDelete(t.id)} className="hover:text-red-600">
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={1} totalPages={1} totalLabel={`Tổng: ${filtered.length} testimonial`} onChange={() => {}} />
        </Panel>

        <Panel title="Thêm địa điểm">
          {showForm ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Tên khách hàng" htmlFor="clientName" required>
                <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
              </Field>
              <Field label="Công ty" htmlFor="company">
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              <Field label="Nội dung đánh giá" htmlFor="quote" required>
                <Textarea id="quote" rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} required />
              </Field>
              <Field label="Số sao">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="text-amber-400">
                      <Star size={20} fill={n <= rating ? "currentColor" : "none"} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Địa điểm" htmlFor="location" required>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="123 Main St, Houston, TX" required />
              </Field>
              <div className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
                <MapPin size={16} />
                Bản đồ minh hoạ vị trí (placeholder)
              </div>
              <div className="flex gap-3">
                <PrimaryButton type="submit">Lưu</PrimaryButton>
                <SecondaryButton onClick={() => setShowForm(false)}>Huỷ</SecondaryButton>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-slate-400">
              <MapPin size={28} />
              Nhấn &quot;Thêm testimonial&quot; để thêm khách hàng và địa điểm mới.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
