import { SiteFooter } from "@/sections/SiteFooter";
import { PostDetailPage } from "@/sections/PostDetailPage";
import { PageTransition } from "@/components/PageTransition";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageTransition>
      <main>
        <PostDetailPage slug={slug} />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
