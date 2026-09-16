import { HeroSection } from "@/sections/HeroSection";
import { TestimonialWall } from "@/sections/TestimonialWall";
import { FeaturedProjects } from "@/sections/FeaturedProjects";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TestimonialWall />
      <FeaturedProjects />
    </main>
  );
}
