import { HeroSection } from "@/sections/HeroSection";
import { TestimonialWall } from "@/sections/TestimonialWall";
import { FeaturedProjects } from "@/sections/FeaturedProjects";
import { WhyChooseUs } from "@/sections/WhyChooseUs";
import { BlogPreview } from "@/sections/BlogPreview";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TestimonialWall />
      <FeaturedProjects />
      <WhyChooseUs />
      <BlogPreview />
    </main>
  );
}
