"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Wrench,
  Star,
  Layers,
  Search,
  Image as ImageIcon,
  Mail,
  ScrollText,
  Settings,
  Snowflake,
  Package,
  UserRound,
  Navigation,
  Languages,
  HeartPulse,
  MapPin,
} from "lucide-react";
import type { ComponentType } from "react";
import { PERMISSIONS, type Permission } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Item is hidden unless the user holds this permission. */
  permission: Permission;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_READ },
  { href: "/admin/users", label: "Nhân sự", icon: Users, permission: PERMISSIONS.USER_READ },
  { href: "/admin/customers", label: "Khách hàng", icon: UserRound, permission: PERMISSIONS.CUSTOMER_READ },
  { href: "/admin/blog", label: "Bài viết", icon: FileText, permission: PERMISSIONS.POST_READ },
  { href: "/admin/products", label: "Sản phẩm", icon: Package, permission: PERMISSIONS.PRODUCT_READ },
  { href: "/admin/projects", label: "Dự án", icon: Briefcase, permission: PERMISSIONS.PROJECT_READ },
  { href: "/admin/services", label: "Dịch vụ", icon: Wrench, permission: PERMISSIONS.SERVICE_READ },
  { href: "/admin/testimonials", label: "Đánh giá", icon: Star, permission: PERMISSIONS.TESTIMONIAL_READ },
  { href: "/admin/client-locations", label: "Bản đồ khách hàng", icon: MapPin, permission: PERMISSIONS.CLIENT_LOCATION_READ },
  { href: "/admin/pages", label: "Trang", icon: Layers, permission: PERMISSIONS.PAGE_READ },
  { href: "/admin/navigation", label: "Header & Footer", icon: Navigation, permission: PERMISSIONS.NAVIGATION_MANAGE },
  { href: "/admin/translations", label: "Chuỗi giao diện", icon: Languages, permission: PERMISSIONS.UI_TRANSLATION_READ },
  { href: "/admin/seo", label: "SEO", icon: Search, permission: PERMISSIONS.SEO_READ },
  { href: "/admin/media", label: "Thư viện ảnh", icon: ImageIcon, permission: PERMISSIONS.MEDIA_READ },
  { href: "/admin/contacts", label: "Liên hệ", icon: Mail, permission: PERMISSIONS.CONTACT_READ },
  { href: "/admin/content-health", label: "Kiểm tra nội dung", icon: HeartPulse, permission: PERMISSIONS.CONTENT_HEALTH_READ },
  { href: "/admin/audit-log", label: "Nhật ký hoạt động", icon: ScrollText, permission: PERMISSIONS.AUDIT_LOG_READ },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings, permission: PERMISSIONS.SETTING_READ },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const visibleItems = navItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="relative flex h-screen w-60 shrink-0 flex-col overflow-hidden text-white">
      <Image
        src="/images/admin/login-banner.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-navy/85" />
      <div className="relative flex items-center gap-2 px-5 py-6">
        <Snowflake className="text-accent" size={26} />
        <div>
          <p className="text-sm font-bold leading-tight tracking-wide">KHAIFROST</p>
          <p className="text-[10px] leading-tight text-white/50">TECHNOLOGY</p>
        </div>
      </div>
      <nav className="relative flex-1 px-3 pb-6">
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="relative border-t border-white/10 px-5 py-4 text-[11px] text-white/40">
        Developed by Nguyen Quoc Huy
      </div>
    </aside>
  );
}
