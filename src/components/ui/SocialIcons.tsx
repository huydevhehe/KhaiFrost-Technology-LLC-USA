import { GitBranch, Users, X } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/content/siteConfig";

const iconMap = { GitHub: GitBranch, LinkedIn: Users, X: X };

export function SocialIcons() {
  return (
    <div className="flex items-center gap-4">
      {siteConfig.socialLinks.map((social) => {
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
