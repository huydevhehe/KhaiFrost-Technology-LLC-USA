import { SiteFooter } from "@/sections/SiteFooter";
import { ServicesOverviewPage } from "@/sections/ServicesOverviewPage";
import { PageTransition } from "@/components/PageTransition";

export default function ServicesPage() {
  return (
    <PageTransition>
      <main>
        <ServicesOverviewPage />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
