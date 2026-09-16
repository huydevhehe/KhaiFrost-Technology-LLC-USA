import Image from "next/image";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "./SiteHeader";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-32 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
            AI-Powered Development Solutions
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Build Smarter with KhaiFrost.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            We create AI-powered tools and digital solutions that help
            businesses move faster, work smarter and grow sustainably.
          </p>
          <div className="mt-8">
            <Button
              variant="primary-blue"
              icon={<Play size={14} fill="currentColor" />}
            >
              Xem demo 30 giây
            </Button>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <Image
            src="/images/placeholders/hero-demo.svg"
            alt="KhaiFrost AI product demo"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
