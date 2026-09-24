export function PostContent({ contentHtml }: { contentHtml: string }) {
  return (
    <div
      className="
        max-w-none text-slate-700
        [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900
        [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900
        [&_p]:mb-4 [&_p]:leading-relaxed
        [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2
        [&_strong]:font-semibold [&_strong]:text-slate-900
        [&_ul]:mb-5 [&_ul]:mt-2 [&_ul]:space-y-2 [&_ul]:list-none [&_ul]:pl-0
        [&_ul_li]:relative [&_ul_li]:pl-7 [&_ul_li]:leading-relaxed
        [&_ul_li:before]:content-['✓'] [&_ul_li:before]:absolute [&_ul_li:before]:left-0
        [&_ul_li:before]:top-0 [&_ul_li:before]:font-bold [&_ul_li:before]:text-accent
        [&_ol]:mb-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5
        [&_blockquote]:relative [&_blockquote]:my-6 [&_blockquote]:rounded-2xl [&_blockquote]:bg-accent/5
        [&_blockquote]:px-8 [&_blockquote]:py-6 [&_blockquote]:text-slate-700 [&_blockquote]:italic
        [&_blockquote:before]:content-['“'] [&_blockquote:before]:absolute [&_blockquote:before]:left-3
        [&_blockquote:before]:top-1 [&_blockquote:before]:text-5xl [&_blockquote:before]:font-serif
        [&_blockquote:before]:not-italic [&_blockquote:before]:text-accent/40
        [&_img]:my-6 [&_img]:w-full [&_img]:rounded-2xl [&_img]:object-cover
        [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0
      "
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
