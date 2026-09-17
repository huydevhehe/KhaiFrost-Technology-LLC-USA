import { ContactHero } from "@/sections/contact-page/ContactHero";
import { ContactInfoForm } from "@/sections/contact-page/ContactInfoForm";
import { AvailabilityCards } from "@/sections/contact-page/AvailabilityCards";
import { OurReach } from "@/sections/contact-page/OurReach";
import { FaqAccordion } from "@/sections/contact-page/FaqAccordion";
import { SiteFooter } from "@/sections/SiteFooter";
import { PageTransition } from "@/components/PageTransition";

export default function ContactPage() {
  return (
    <PageTransition>
      <main>
        <ContactHero />
        <ContactInfoForm />
        <AvailabilityCards />
        <OurReach />
        <FaqAccordion />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
