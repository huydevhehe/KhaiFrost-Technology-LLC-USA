"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { blogPosts } from "@/content/blogPosts";
import { BlogPost } from "@/types";

function BlogCard({ post }: { post: BlogPost }) {
  const title = useLocalizedField(post.title);
  const excerpt = useLocalizedField(post.excerpt);

  return (
    <a
      href={post.href}
      className="block rounded-xl p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <VideoThumbnail
        src={post.thumbnail}
        alt={title}
        showVideoBadge={post.hasVideo}
      />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        {excerpt}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-400">{post.date}</p>
    </a>
  );
}

export function BlogPreview() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionEyebrow>{t("blog.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("blog.heading")}</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("blog.viewAll")}
          </a>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
