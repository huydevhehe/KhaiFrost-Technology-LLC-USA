import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { navLinks } from "@/content/navLinks";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
            K
          </span>
          <span className="text-sm font-semibold tracking-wide">
            KHAIFROST
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/90 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <Button href="/contact" variant="primary-pill-light">
          Get Started →
        </Button>
      </div>
    </header>
  );
}
