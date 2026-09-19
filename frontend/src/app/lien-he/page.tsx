import { ContactHero } from "@/sections/contact-page/ContactHero";
import { ContactInfoForm } from "@/sections/contact-page/ContactInfoForm";
import { AvailabilityCards } from "@/sections/contact-page/AvailabilityCards";
import { OurReach } from "@/sections/contact-page/OurReach";
import { FaqAccordion } from "@/sections/contact-page/FaqAccordion";
import { SiteFooter } from "@/sections/SiteFooter";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function ContactPage() {
  return (
    <PageTransition>
      <main>
        <ContactHero />
        <Reveal>
          <ContactInfoForm />
        </Reveal>
        <Reveal>
          <AvailabilityCards />
        </Reveal>
        <Reveal>
          <OurReach />
        </Reveal>
        <Reveal>
          <FaqAccordion />
        </Reveal>
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
