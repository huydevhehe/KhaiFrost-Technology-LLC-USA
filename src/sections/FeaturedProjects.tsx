import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { Pill } from "@/components/ui/Pill";
import { projects } from "@/content/projects";

export function FeaturedProjects() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <SectionEyebrow>Featured Projects</SectionEyebrow>
            <SectionHeading>Our Latest Work</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            View all projects →
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <VideoThumbnail src={p.thumbnail} alt={p.title} />
              <h3 className="mt-4 font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.techStack.map((tech) => (
                  <Pill key={tech} label={tech} />
                ))}
              </div>
              <a
                href={p.demoHref}
                className="mt-4 inline-block text-sm font-medium text-accent"
              >
                Xem demo đầy đủ →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
