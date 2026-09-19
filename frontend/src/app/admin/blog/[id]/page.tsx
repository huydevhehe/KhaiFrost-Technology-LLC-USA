"use client";

import { use } from "react";
import { ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import type { AdminPostDetail } from "@/lib/api/admin/posts";
import { PostEditor } from "../PostEditor";
import { usePostCategories } from "../useCategories";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const categories = usePostCategories();
  const resource = useApiResource<AdminPostDetail>(`/admin/posts/${encodeURIComponent(id)}`);

  if (resource.loading && !resource.data) return <TableSkeleton rows={8} columns={2} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.refetch} />;
  if (!resource.data) return <ErrorState message="Không tìm thấy bài viết." />;

  return (
    <PostEditor
      key={`${resource.data.id}:${resource.data.version}`}
      initial={resource.data}
      categories={categories.categories}
      onCategoriesChanged={categories.reload}
      onReload={resource.refetch}
      reloading={resource.loading}
    />
  );
}
