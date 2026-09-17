import { HeroSection } from "@/sections/HeroSection";
import { ServicesSection } from "@/sections/ServicesSection";
import { GlobalClientsMap } from "@/sections/GlobalClientsMap";
import { FeaturedProjects } from "@/sections/FeaturedProjects";
import { WhyChooseUs } from "@/sections/WhyChooseUs";
import { BlogPreview } from "@/sections/BlogPreview";
import { ContactSection } from "@/sections/ContactSection";
import { SiteFooter } from "@/sections/SiteFooter";
import { PageTransition } from "@/components/PageTransition";

export default function Home() {
  return (
    <PageTransition>
      <main>
        <HeroSection />
        <ServicesSection />
        <FeaturedProjects />
        <GlobalClientsMap />
        <BlogPreview />
        <WhyChooseUs />
        <ContactSection />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
