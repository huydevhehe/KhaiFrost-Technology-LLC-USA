import { HeroSection } from "@/sections/HeroSection";
import { ServicesSection } from "@/sections/ServicesSection";
import { GlobalClientsMap } from "@/sections/GlobalClientsMap";
import { FeaturedProjects } from "@/sections/FeaturedProjects";
import { WhyChooseUs } from "@/sections/WhyChooseUs";
import { BlogPreview } from "@/sections/BlogPreview";
import { ContactSection } from "@/sections/ContactSection";
import { SiteFooter } from "@/sections/SiteFooter";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function Home() {
  return (
    <PageTransition>
      <main>
        <HeroSection />
        <Reveal>
          <ServicesSection />
        </Reveal>
        <Reveal>
          <FeaturedProjects />
        </Reveal>
        <Reveal>
          <GlobalClientsMap />
        </Reveal>
        <Reveal>
          <BlogPreview />
        </Reveal>
        <Reveal>
          <WhyChooseUs />
        </Reveal>
        <Reveal>
          <ContactSection />
        </Reveal>
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
