"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { Pill } from "@/components/ui/Pill";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { projects } from "@/content/projects";
import { Project } from "@/types";

function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation();
  const title = useLocalizedField(project.title);
  const description = useLocalizedField(project.description);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <VideoThumbnail src={project.thumbnail} alt={title} />
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.techStack.map((tech) => (
          <Pill key={tech} label={tech} />
        ))}
      </div>
      <a
        href={project.demoHref}
        className="mt-4 inline-block text-sm font-medium text-accent"
      >
        {t("featuredProjects.viewDemo")}
      </a>
    </div>
  );
}

export function FeaturedProjects() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <SectionEyebrow>{t("featuredProjects.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("featuredProjects.heading")}</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("featuredProjects.viewAll")}
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
