import { Zap, ShieldCheck, Users, Rocket, LucideIcon } from "lucide-react";
import { WhyUsIcon } from "@/types";

const iconMap: Record<WhyUsIcon, LucideIcon> = {
  bolt: Zap,
  shield: ShieldCheck,
  users: Users,
  rocket: Rocket,
};

export function IconCircle({ icon }: { icon: WhyUsIcon }) {
  const Icon = iconMap[icon];
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
      <Icon size={20} />
    </div>
  );
}
