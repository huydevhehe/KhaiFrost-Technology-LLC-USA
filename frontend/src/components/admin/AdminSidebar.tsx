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
} from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/projects", label: "Projects", icon: Briefcase },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  { href: "/admin/pages", label: "Pages", icon: Layers },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/contacts", label: "Contacts", icon: Mail },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
      <nav className="relative flex-1 overflow-y-auto px-3 pb-6">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
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
    </aside>
  );
}
