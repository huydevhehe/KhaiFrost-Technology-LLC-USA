import {
  Zap,
  ShieldCheck,
  Users,
  Rocket,
  Bot,
  Cloud,
  Lock,
  Code2,
  TrendingUp,
  Clock,
  Search,
  Lightbulb,
  Settings,
  LineChart,
  Briefcase,
  Headphones,
  Eye,
  Target,
  Calendar,
  Globe,
  Heart,
  FileText,
  Check,
  LucideIcon,
} from "lucide-react";
import { WhyUsIcon, ServiceIcon, CategoryIcon } from "@/types";

const iconMap: Record<WhyUsIcon | ServiceIcon | CategoryIcon, LucideIcon> = {
  bolt: Zap,
  shield: ShieldCheck,
  users: Users,
  rocket: Rocket,
  ai: Bot,
  cloud: Cloud,
  security: Lock,
  code: Code2,
  trendingUp: TrendingUp,
  clock: Clock,
  search: Search,
  lightbulb: Lightbulb,
  settings: Settings,
  lineChart: LineChart,
  briefcase: Briefcase,
  headset: Headphones,
  eye: Eye,
  target: Target,
  calendar: Calendar,
  globe: Globe,
  heart: Heart,
  fileText: FileText,
  check: Check,
};

export function IconCircle({
  icon,
}: {
  icon: WhyUsIcon | ServiceIcon | CategoryIcon;
}) {
  const Icon = iconMap[icon];
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
      <Icon size={20} />
    </div>
  );
}
