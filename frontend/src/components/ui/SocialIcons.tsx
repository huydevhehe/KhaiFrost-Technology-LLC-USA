import { GitBranch, Briefcase, X, LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSiteConfig } from "@/lib/content/site";
import { SocialLink } from "@/types";

const iconMap: Record<SocialLink["label"], LucideIcon> = {
  GitHub: GitBranch,
  LinkedIn: Briefcase,
  X,
};

export function SocialIcons() {
  const { socialLinks } = useSiteConfig();
  return (
    <div className="flex items-center gap-4">
      {socialLinks.map((social) => {
        const Icon = iconMap[social.label];
        return (
          <Link
            key={social.label}
            href={social.href}
            aria-label={social.label}
            className="text-white/50 hover:text-white"
          >
            <Icon size={18} />
          </Link>
        );
      })}
    </div>
  );
}
