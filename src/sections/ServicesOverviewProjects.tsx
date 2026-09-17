"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { projects } from "@/content/projects";
import { Project } from "@/types";

function ProjectOverviewCard({ project }: { project: Project }) {
  const title = useLocalizedField(project.title);
  const description = useLocalizedField(project.description);
  const categoryLabel = useLocalizedField(
    project.categoryLabel ?? { en: "", vi: "" }
  );

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <VideoThumbnail src={project.thumbnail} alt={title} />
        {project.categoryLabel && (
          <span className="absolute bottom-2 left-2 rounded-full bg-navy/80 px-2.5 py-1 text-[11px] font-medium text-white">
            {categoryLabel}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ServicesOverviewProjects() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <SectionEyebrow>{t("servicesOverviewPage.projects.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("servicesOverviewPage.projects.heading")}</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("servicesOverviewPage.projects.viewAll")}
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <ProjectOverviewCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
