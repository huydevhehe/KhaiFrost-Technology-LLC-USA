"use client";

import { notFound } from "next/navigation";
import { useContentLocale } from "@/lib/content/store";
import { usePostDetail, formatPostDetailDate, type PublicPostDetail } from "@/lib/content/postDetail";
import { PostHero } from "@/sections/PostHero";
import { PostBreadcrumb } from "@/sections/PostBreadcrumb";
import { PostContent } from "@/sections/PostContent";
import { PostSidebar } from "@/sections/PostSidebar";
import { PostNeighborNav } from "@/sections/PostNeighborNav";
import { PostRelated } from "@/sections/PostRelated";
import { Reveal } from "@/components/ui/Reveal";

export function PostDetailPage({ slug }: { slug: string }) {
  const { post, notFound: missing } = usePostDetail(slug);

  if (missing) notFound();
  if (!post) return <div className="min-h-screen bg-navy" />;

  return <PostDetailContent post={post} />;
}

function PostDetailContent({ post }: { post: PublicPostDetail }) {
  const locale = useContentLocale();
  const dateLabel = formatPostDetailDate(post.publishedAt, locale);

  return (
    <>
      <PostHero
        categoryName={post.category?.name ?? ""}
        title={post.title}
        coverImageUrl={post.coverImage?.url ?? null}
        dateLabel={dateLabel}
        readingTimeMinutes={post.readingTimeMinutes}
      />
      <PostBreadcrumb categoryName={post.category?.name ?? null} postTitle={post.title} />

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[2fr_1fr]">
          <Reveal>
            <PostContent contentHtml={post.contentHtml} />
          </Reveal>
          <Reveal>
            <PostSidebar tags={post.tags} related={post.related} />
          </Reveal>
        </div>
      </section>

      {(post.previous || post.next) && (
        <section className="bg-white pb-12">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal>
              <PostNeighborNav previous={post.previous} next={post.next} />
            </Reveal>
          </div>
        </section>
      )}

      {post.related.length > 0 && (
        <Reveal>
          <PostRelated related={post.related} />
        </Reveal>
      )}
    </>
  );
}
