"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { LocalizedText } from "@/types";

export function CategoryBreadcrumb({
  categoryName,
  currentLabel,
}: {
  categoryName?: LocalizedText;
  // Nhãn cho mục hiện tại khi KHÔNG truyền categoryName (trang không thuộc
  // hệ thống danh mục dịch vụ, ví dụ "/ve-chung-toi"). Mặc định giữ nguyên
  // hành vi cũ ("Dịch vụ") để không phá vỡ các trang đang dùng component này.
  currentLabel?: string;
}) {
  const { t } = useTranslation();
  const name = useLocalizedField(categoryName ?? { en: "", vi: "" });

  return (
    <nav className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-3 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-700">
          {t("serviceCategoryPage.breadcrumb.home")}
        </Link>
        <span className="mx-2">/</span>
        {categoryName ? (
          <>
            <Link href="/dich-vu" className="hover:text-slate-700">
              {t("serviceCategoryPage.breadcrumb.service")}
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-slate-900">{name}</span>
          </>
        ) : (
          <span className="font-medium text-slate-900">
            {currentLabel ?? t("serviceCategoryPage.breadcrumb.service")}
          </span>
        )}
      </div>
    </nav>
  );
}
