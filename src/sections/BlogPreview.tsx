import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { blogPosts } from "@/content/blogPosts";

export function BlogPreview() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-center justify-between">
          <SectionEyebrow>Latest From Our Blog</SectionEyebrow>
          <a href="#" className="text-sm font-medium text-accent">
            View all articles →
          </a>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {blogPosts.map((post) => (
            <a key={post.id} href={post.href} className="block">
              <VideoThumbnail
                src={post.thumbnail}
                alt={post.title}
                showVideoBadge={post.hasVideo}
              />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {post.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{post.date}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
