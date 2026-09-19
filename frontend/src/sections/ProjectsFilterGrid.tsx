"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { useProjectCategories, useProjects, type ProjectCategoryFilter } from "@/lib/content/catalog";
import { Project } from "@/types";

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "border border-slate-200 text-slate-600 hover:border-accent/40 hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}

function CategoryFilterPill({
  category,
  active,
  onClick,
}: {
  category: ProjectCategoryFilter;
  active: boolean;
  onClick: () => void;
}) {
  const label = useLocalizedField(category.label);
  return <FilterPill label={label} active={active} onClick={onClick} />;
}

function ProjectCard({ project }: { project: Project }) {
  const title = useLocalizedField(project.title);
  const description = useLocalizedField(project.description);
  const categoryLabel = useLocalizedField(
    project.categoryLabel ?? { en: "", vi: "" }
  );

  return (
    <Link
      href={project.demoHref}
      className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-slate-100 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-accent/20 hover:shadow-[0_25px_50px_-15px_rgba(14,165,233,0.35)]"
    >
      <Image
        src={project.thumbnail}
        alt={title}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {project.categoryLabel && (
        <span className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
          {categoryLabel}
        </span>
      )}

      {project.hasVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform duration-500 ease-out group-hover:scale-110">
            <Play size={18} className="ml-0.5 text-slate-900" fill="currentColor" />
          </div>
        </div>
      )}
      {project.hasVideo && project.videoDuration && (
        <span className="absolute bottom-3 right-3 z-20 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {project.videoDuration}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 translate-y-1 bg-white/45 px-5 py-2 backdrop-blur-none transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:bg-white/70 group-hover:py-5 group-hover:backdrop-blur-md">
        <span className="mb-0 block h-0.5 w-0 rounded-full bg-accent transition-all duration-500 ease-out group-hover:mb-2 group-hover:w-10" />
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
              {title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
              {description}
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform duration-500 ease-out group-hover:scale-110">
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProjectsFilterGrid() {
  const { t } = useTranslation();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const projects = useProjects();
  const categories = useProjectCategories();
  const activeCategory = categories.find((category) => category.slug === activeSlug);
  const filteredProjects = activeCategory
    ? projects.filter((project) =>
        project.categorySlug
          ? project.categorySlug === activeCategory.slug
          : project.categoryLabel?.en === activeCategory.label.en
      )
    : projects;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <FilterPill
            label={t("projectsPage.filters.all")}
            active={activeSlug === null}
            onClick={() => setActiveSlug(null)}
          />
          {categories.map((category) => (
            <CategoryFilterPill
              key={category.slug}
              category={category}
              active={activeSlug === category.slug}
              onClick={() => setActiveSlug(category.slug)}
            />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
