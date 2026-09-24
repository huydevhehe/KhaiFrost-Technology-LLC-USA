"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useContentLocale } from "@/lib/content/store";
import { formatPostDetailDate, type PublicPostListItem } from "@/lib/content/postDetail";
import { SectionHeading } from "@/components/ui/SectionHeading";

function RelatedCard({ post }: { post: PublicPostListItem }) {
  const locale = useContentLocale();

  return (
    <Link
      href={`/bai-viet/${post.slug}`}
      className="block rounded-xl p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
        {post.coverImage && (
          <Image src={post.coverImage.url} alt={post.title} fill className="object-cover" />
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{post.title}</h3>
      <p className="mt-2 text-xs font-medium text-slate-400">
        {formatPostDetailDate(post.publishedAt, locale)}
      </p>
    </Link>
  );
}

export function PostRelated({ related }: { related: PublicPostListItem[] }) {
  const { t } = useTranslation();

  if (related.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading className="mb-8">{t("postDetailPage.related.heading")}</SectionHeading>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {related.slice(0, 3).map((post) => (
            <RelatedCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
