"use client";

import { ErrorState, TableSkeleton } from "@/components/admin/shared";
import { InfoNotice } from "@/components/admin/content";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { PostEditor } from "../PostEditor";
import { usePostCategories } from "../useCategories";

export default function NewPostPage() {
  const { hasPermission, loading } = useAuth();
  const categories = usePostCategories();

  if (loading || categories.loading) return <TableSkeleton rows={6} columns={2} />;
  if (!hasPermission(PERMISSIONS.POST_CREATE)) {
    return <InfoNotice>Bạn không có quyền tạo bài viết mới.</InfoNotice>;
  }
  if (categories.error) {
    return <ErrorState error={categories.error} onRetry={categories.reload} />;
  }

  return (
    <PostEditor
      initial={null}
      categories={categories.categories}
      onCategoriesChanged={categories.reload}
    />
  );
}
