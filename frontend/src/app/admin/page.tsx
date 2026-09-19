"use client";

import Link from "next/link";
import {
  Briefcase,
  FileText,
  HeartPulse,
  Image as ImageIcon,
  Mail,
  Minus,
  Package,
  ScrollText,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { Panel } from "@/components/admin/ui";
import {
  CONTACT_COLORS,
  PUBLICATION_COLORS,
  StatusBar,
  StatusDonut,
  type StatusSegment,
} from "@/components/admin/system/StatusChart";
import { IssueList, ReadinessList } from "@/components/admin/system/ContentHealth";
import { ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import { formatDateTime } from "@/lib/format";
import { describeAuditAction } from "@/lib/api/admin/auditLog";
import type { CountTrend, DashboardSummary, RecentActivityItem } from "@/lib/api/admin/dashboard";
import {
  readinessChecks,
  type ContentHealthReport,
} from "@/lib/api/admin/contentHealth";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const CARD_ICONS = {
  posts: FileText,
  products: Package,
  projects: Briefcase,
  contacts: Mail,
} as const;

function TrendLine({ trend }: { trend: CountTrend }) {
  if (trend.changePercent === null) {
    return (
      <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
        <Minus size={13} />
        {trend.createdLast30Days.toLocaleString("vi-VN")} mục mới trong 30 ngày
      </p>
    );
  }
  const up = trend.changePercent >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={`flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon size={13} />
      {up ? "+" : ""}
      {trend.changePercent.toLocaleString("vi-VN")}% so với 30 ngày trước
    </p>
  );
}

function StatCard({
  id,
  label,
  trend,
  href,
  extra,
}: {
  id: keyof typeof CARD_ICONS;
  label: string;
  trend: CountTrend;
  href: string;
  extra?: string;
}) {
  const Icon = CARD_ICONS[id];
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon size={16} />
        </span>
        <Link href={href} className="hover:text-accent hover:underline">
          {label}
        </Link>
      </div>
      <p className="text-3xl font-bold text-slate-900">{trend.total.toLocaleString("vi-VN")}</p>
      {extra && <p className="-mt-2 text-xs text-slate-500">{extra}</p>}
      <TrendLine trend={trend} />
    </Panel>
  );
}

function MiniStat({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof Wrench;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-accent/60 focus:ring-2 focus:ring-accent/30 focus:outline-none"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-slate-500">{label}</span>
        <span className="block text-lg font-semibold text-slate-900">{value.toLocaleString("vi-VN")}</span>
      </span>
    </Link>
  );
}

const QUICK_LINKS: { href: string; label: string; icon: typeof Wrench }[] = [
  { href: "/admin/blog", label: "Viết bài mới", icon: FileText },
  { href: "/admin/products", label: "Quản lý sản phẩm", icon: Package },
  { href: "/admin/projects", label: "Quản lý dự án", icon: Briefcase },
  { href: "/admin/media", label: "Thư viện media", icon: ImageIcon },
  { href: "/admin/contacts", label: "Hộp thư liên hệ", icon: Mail },
  { href: "/admin/users", label: "Tài khoản nội bộ", icon: Users },
];

function publicationSegments(byStatus: DashboardSummary["posts"]["byStatus"]): StatusSegment[] {
  return [
    { key: "published", label: "Đã xuất bản", value: byStatus.published, color: PUBLICATION_COLORS.published },
    { key: "in_review", label: "Chờ duyệt", value: byStatus.in_review, color: PUBLICATION_COLORS.in_review },
    { key: "draft", label: "Nháp", value: byStatus.draft, color: PUBLICATION_COLORS.draft },
    { key: "archived", label: "Lưu trữ", value: byStatus.archived, color: PUBLICATION_COLORS.archived },
  ];
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const canReadHealth = !!user?.permissions.includes(PERMISSIONS.CONTENT_HEALTH_READ);

  const summary = useApiResource<DashboardSummary>("/admin/dashboard/summary");
  const activity = useApiResource<RecentActivityItem[]>("/admin/dashboard/recent-activity");
  const health = useApiResource<ContentHealthReport>(
    canReadHealth ? "/admin/content-health" : null,
  );

  const data = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-sm text-slate-500">
          Số liệu nội dung và hoạt động gần đây của hệ thống.
          {data && (
            <span className="text-slate-400"> Cập nhật lúc {formatDateTime(data.generatedAt)}.</span>
          )}
        </p>
      </div>

      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.refetch} retryLabel="Tải lại" />
      ) : summary.loading && !data ? (
        <Panel>
          <TableSkeleton rows={4} columns={4} />
        </Panel>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard id="posts" label="Bài viết" trend={data.posts} href="/admin/blog" />
            <StatCard id="products" label="Sản phẩm" trend={data.products} href="/admin/products" />
            <StatCard id="projects" label="Dự án" trend={data.projects} href="/admin/projects" />
            <StatCard
              id="contacts"
              label="Liên hệ"
              trend={data.contacts}
              href="/admin/contacts"
              extra={`${data.contacts.unread.toLocaleString("vi-VN")} liên hệ chưa xem`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <MiniStat label="Dịch vụ" value={data.services.total} href="/admin/services" icon={Wrench} />
            <MiniStat
              label="Đánh giá"
              value={data.testimonials.total}
              href="/admin/testimonials"
              icon={ScrollText}
            />
            <MiniStat label="Tệp media" value={data.mediaAssets.total} href="/admin/media" icon={ImageIcon} />
            <MiniStat label="Khách hàng" value={data.customers.total} href="/admin/customers" icon={UserRound} />
            <MiniStat label="Nhân sự" value={data.staffUsers.total} href="/admin/users" icon={Users} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Nội dung theo trạng thái" className="xl:col-span-2">
              <div className="flex flex-col gap-5">
                <StatusBar title="Bài viết" segments={publicationSegments(data.posts.byStatus)} />
                <StatusBar title="Sản phẩm" segments={publicationSegments(data.products.byStatus)} />
                <StatusBar title="Dự án" segments={publicationSegments(data.projects.byStatus)} />
                <StatusBar title="Dịch vụ" segments={publicationSegments(data.services.byStatus)} />
              </div>
            </Panel>

            <Panel title="Liên hệ theo trạng thái">
              <StatusDonut
                centerLabel="liên hệ"
                centerValue={data.contacts.total.toLocaleString("vi-VN")}
                segments={[
                  { key: "new", label: "Mới", value: data.contacts.byStatus.new, color: CONTACT_COLORS.new },
                  { key: "seen", label: "Đã xem", value: data.contacts.byStatus.seen, color: CONTACT_COLORS.seen },
                  {
                    key: "replied",
                    label: "Đã phản hồi",
                    value: data.contacts.byStatus.replied,
                    color: CONTACT_COLORS.replied,
                  },
                  {
                    key: "archived",
                    label: "Lưu trữ",
                    value: data.contacts.byStatus.archived,
                    color: CONTACT_COLORS.archived,
                  },
                ]}
              />
            </Panel>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {canReadHealth && (
          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                <HeartPulse size={16} className="text-accent" />
                Sức khoẻ nội dung
              </span>
            }
            action={
              <Link href="/admin/content-health" className="text-sm font-medium text-accent hover:underline">
                Xem chi tiết
              </Link>
            }
          >
            {health.error ? (
              <ErrorState error={health.error} onRetry={health.refetch} retryLabel="Tải lại" />
            ) : health.loading && !health.data ? (
              <TableSkeleton rows={4} columns={2} withHeader={false} />
            ) : health.data ? (
              <div className="flex flex-col gap-3">
                <ReadinessList checks={readinessChecks(health.data)} />
                <div className="border-t border-slate-100 pt-2">
                  <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                    Vấn đề cần xử lý
                  </p>
                  {health.data.issues.length === 0 ? (
                    <p className="py-2 text-sm text-emerald-600">Không có vấn đề nào.</p>
                  ) : (
                    <IssueList issues={health.data.issues} limit={4} />
                  )}
                </div>
              </div>
            ) : null}
          </Panel>
        )}

        <Panel title="Lối tắt">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-accent/60 hover:text-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Hoạt động gần đây"
          action={
            <Link href="/admin/audit-log" className="text-sm font-medium text-accent hover:underline">
              Xem tất cả
            </Link>
          }
        >
          {activity.error ? (
            <ErrorState error={activity.error} onRetry={activity.refetch} retryLabel="Tải lại" />
          ) : activity.loading && !activity.data ? (
            <TableSkeleton rows={5} columns={2} withHeader={false} />
          ) : !activity.data || activity.data.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Chưa có hoạt động nào được ghi nhận.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {activity.data.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.actorName ?? "Hệ thống"}
                    </p>
                    <p className="truncate text-sm text-slate-500">{describeAuditAction(item.action)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(item.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
