import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { testimonials } from "@/content/testimonials";

export function TestimonialWall() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-center justify-between">
          <SectionEyebrow>Real People. Real Results.</SectionEyebrow>
          <a href="#" className="text-sm font-medium text-accent">
            Xem thêm video →
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {testimonials.map((t) => (
            <div key={t.id}>
              <VideoThumbnail src={t.thumbnail} alt={t.name} aspect="square" />
              <p className="mt-3 text-sm font-medium text-slate-800">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t.name} · {t.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
