import { SYSTEM_PAGES, SystemPageMapping } from '../seed-content-mapping';
import {
  CONTACT_AVAILABILITY_CARDS,
  CONTACT_FAQ_KEYS,
  CONTACT_REACH_STATS,
  PAGE_SEO_ENGLISH,
  PROJECTS_PAGE_SEO,
} from '../seed-generated-content';
import { SeedContext } from '../seed.types';
import {
  buildSectionContent,
  joinLines,
  ListItemSpec,
  SectionContentInput,
} from './section-content.builder';
import { toParagraphs } from './html';
import { SourceCategoryWhyUsItem, SourceLocalizedText, SourceStat } from './source-content.types';

export interface SectionBlueprint {
  sectionKey: string;
  type: string;
  content: SectionContentInput;
}

export interface PageSeoTexts {
  title: string;
  description: string;
  keywords: string;
}

export interface PageBlueprint {
  mapping: SystemPageMapping;
  title: SourceLocalizedText;
  seo: { vi: PageSeoTexts; en: PageSeoTexts };
  ogImageId: string | null;
  sections: SectionBlueprint[];
}

// Composes the five public pages from the same content the Next.js components render today
export async function buildPageBlueprints(context: SeedContext): Promise<PageBlueprint[]> {
  const builder = new PageBlueprintBuilder(context);
  return Promise.all(SYSTEM_PAGES.map((mapping) => builder.build(mapping)));
}

class PageBlueprintBuilder {
  constructor(private readonly context: SeedContext) {}

  private get content() {
    return this.context.content;
  }

  private text(key: string): SourceLocalizedText {
    return this.content.text(key);
  }

  private image(path: string | undefined): Promise<string | null> {
    return this.context.media.idFor(path);
  }

  private section(
    sectionKey: string,
    type: string,
    content: SectionContentInput,
  ): SectionBlueprint {
    return { sectionKey, type, content };
  }

  async build(mapping: SystemPageMapping): Promise<PageBlueprint> {
    const sections = await this.sectionsOf(mapping.path);
    return {
      mapping,
      title: this.text(mapping.titleKey),
      seo: this.seoOf(mapping),
      ogImageId: await this.image(mapping.seoOgImage),
      sections,
    };
  }

  private seoOf(mapping: SystemPageMapping): PageBlueprint['seo'] {
    if (!mapping.seoPageId) return { vi: PROJECTS_PAGE_SEO.vi, en: PROJECTS_PAGE_SEO.en };
    const entry = this.content
      .seoSettings()
      .find((candidate) => candidate.pageId === mapping.seoPageId);
    const english = PAGE_SEO_ENGLISH[mapping.seoPageId];
    if (!entry || !english) throw new Error(`No SEO texts for page "${mapping.seoPageId}"`);
    return {
      vi: { title: entry.title, description: entry.metaDescription, keywords: entry.keywords },
      en: english,
    };
  }

  private sectionsOf(path: string): Promise<SectionBlueprint[]> {
    switch (path) {
      case '/':
        return this.home();
      case '/dich-vu':
        return this.services();
      case '/du-an':
        return this.projects();
      case '/ve-chung-toi':
        return this.about();
      case '/lien-he':
        return this.contact();
      default:
        throw new Error(`No blueprint for page ${path}`);
    }
  }

  private statItems(stats: SourceStat[], prefix: string): ListItemSpec[] {
    return stats.map((stat, index) => ({
      id: `${prefix}-${index + 1}`,
      shared: { icon: stat.icon, value: stat.value },
      text: { label: stat.label, description: stat.description },
    }));
  }

  private valueItems(items: SourceCategoryWhyUsItem[], prefix: string): ListItemSpec[] {
    return items.map((item, index) => ({
      id: `${prefix}-${index + 1}`,
      shared: { icon: item.icon },
      text: { title: item.title, description: item.description },
    }));
  }

  private stats(sectionKey: string, stats: SourceStat[]): SectionBlueprint {
    return this.section(
      sectionKey,
      'stats',
      buildSectionContent({ lists: { items: this.statItems(stats, 'stat') } }),
    );
  }

  private async heroSection(options: {
    image: string;
    eyebrow: SourceLocalizedText;
    headline: SourceLocalizedText;
    description: SourceLocalizedText;
    alt: SourceLocalizedText;
    primary?: { label: SourceLocalizedText; url: string };
    secondary?: { label: SourceLocalizedText; url: string };
  }): Promise<SectionBlueprint> {
    return this.section(
      'hero',
      'hero',
      buildSectionContent({
        text: {
          eyebrow: options.eyebrow,
          headline: options.headline,
          description: options.description,
          backgroundImageAlt: options.alt,
          primaryCtaLabel: options.primary?.label,
          secondaryCtaLabel: options.secondary?.label,
        },
        shared: {
          backgroundImage: await this.image(options.image),
          primaryCtaUrl: options.primary?.url,
          secondaryCtaUrl: options.secondary?.url,
          alignment: 'left',
        },
      }),
    );
  }

  private cta(prefix: string): SectionBlueprint {
    return this.section(
      'cta',
      'cta',
      buildSectionContent({
        text: {
          eyebrow: this.text(`${prefix}.cta.eyebrow`),
          heading: this.text(`${prefix}.cta.heading`),
          description: this.text(`${prefix}.cta.description`),
          buttonLabel: this.text(`${prefix}.cta.button`),
        },
        shared: { buttonUrl: '/lien-he' },
      }),
    );
  }

  private featured(
    sectionKey: string,
    collection: string,
    count: number,
    texts: { eyebrow?: string; heading?: string; viewAll?: string; viewAllUrl?: string },
  ): SectionBlueprint {
    return this.section(
      sectionKey,
      'featured-content',
      buildSectionContent({
        text: {
          eyebrow: texts.eyebrow ? this.text(texts.eyebrow) : undefined,
          heading: texts.heading ? this.text(texts.heading) : undefined,
          viewAllLabel: texts.viewAll ? this.text(texts.viewAll) : undefined,
        },
        shared: { collection, count, viewAllUrl: texts.viewAllUrl },
      }),
    );
  }

  private async home(): Promise<SectionBlueprint[]> {
    const hero = await this.heroSection({
      image: '/images/hero/banner-3.jpg',
      eyebrow: this.text('hero.eyebrow'),
      headline: this.text('hero.headline'),
      description: this.text('hero.subtext'),
      alt: this.text('hero.headline'),
      primary: { label: this.text('hero.cta'), url: '/demo' },
    });
    return [
      hero,
      this.featured('services', 'services', 4, {
        eyebrow: 'services.eyebrow',
        heading: 'services.heading',
      }),
      this.featured('featured-projects', 'projects', 6, {
        eyebrow: 'featuredProjects.eyebrow',
        heading: 'featuredProjects.heading',
        viewAll: 'featuredProjects.viewAll',
        viewAllUrl: '/du-an',
      }),
      // The section shows at most 12 clients; the map itself reads the whole client-locations endpoint
      this.featured('global-clients', 'client-locations', 12, {
        eyebrow: 'globalClients.eyebrow',
        heading: 'globalClients.heading',
      }),
      this.featured('blog-preview', 'posts', 4, {
        eyebrow: 'blog.eyebrow',
        heading: 'blog.heading',
      }),
      this.section(
        'why-choose-us',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text('whyChooseUs.eyebrow'),
            heading: this.text('whyChooseUs.heading'),
            intro: this.text('whyChooseUs.paragraph'),
          },
          shared: { columns: '4' },
          lists: {
            items: this.content.whyUsItems().map((item) => ({
              id: item.id,
              shared: { icon: item.icon },
              text: { title: item.title, description: item.description },
            })),
          },
        }),
      ),
      this.section(
        'contact',
        'contact-form',
        buildSectionContent({
          text: {
            eyebrow: this.text('contact.eyebrow'),
            heading: this.text('contact.heading'),
            description: this.text('contact.subtext'),
          },
          shared: { showOffices: false },
        }),
      ),
    ];
  }

  private async services(): Promise<SectionBlueprint[]> {
    const page = 'servicesOverviewPage';
    return [
      await this.heroSection({
        image: '/images/services-overview/hero.jpg',
        eyebrow: this.text(`${page}.hero.eyebrow`),
        headline: joinLines(
          this.text(`${page}.hero.headlineLine1`),
          this.text(`${page}.hero.headlineLine2`),
        ),
        description: this.text(`${page}.hero.description`),
        alt: this.text(`${page}.hero.imageAlt`),
        primary: { label: this.text(`${page}.hero.ctaDemo`), url: '/demo' },
        secondary: { label: this.text(`${page}.hero.ctaContact`), url: '/lien-he' },
      }),
      this.stats('stats', this.content.servicesOverviewStats()),
      this.featured('core-services', 'services', 4, {
        eyebrow: `${page}.services.eyebrow`,
        heading: `${page}.services.heading`,
      }),
      this.featured('featured-projects', 'projects', 6, {
        eyebrow: `${page}.projects.eyebrow`,
        heading: `${page}.projects.heading`,
        viewAll: `${page}.projects.viewAll`,
        viewAllUrl: '/du-an',
      }),
      this.section(
        'process',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.process.eyebrow`),
            heading: this.text(`${page}.process.heading`),
          },
          shared: { columns: '4' },
          lists: {
            items: this.content.servicesOverviewProcessSteps().map((step) => ({
              id: `step-${step.step}`,
              shared: { icon: step.icon, badge: step.step },
              text: { title: step.title, description: step.description },
            })),
          },
        }),
      ),
      this.section(
        'why-us',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.whyUs.eyebrow`),
            heading: this.text(`${page}.whyUs.heading`),
            intro: this.text(`${page}.whyUs.paragraph`),
          },
          shared: { columns: '4' },
          lists: {
            items: this.content.whyUsItems().map((item) => ({
              id: item.id,
              shared: { icon: item.icon },
              text: { title: item.title, description: item.description },
            })),
          },
        }),
      ),
      this.cta(page),
    ];
  }

  private async projects(): Promise<SectionBlueprint[]> {
    const page = 'projectsPage';
    return [
      await this.heroSection({
        image: '/images/projects-page/hero.jpg',
        eyebrow: this.text(`${page}.hero.eyebrow`),
        headline: joinLines(
          this.text(`${page}.hero.headlineLine1`),
          this.text(`${page}.hero.headlineLine2`),
        ),
        description: this.text(`${page}.hero.description`),
        alt: this.text(`${page}.hero.imageAlt`),
      }),
      this.featured('projects-grid', 'projects', 12, {}),
      this.stats('stats', this.content.projectsPageStats()),
      this.cta(page),
    ];
  }

  private async about(): Promise<SectionBlueprint[]> {
    const page = 'aboutPage';
    const vision = this.content.aboutVision();
    const mission = this.content.aboutMission();
    const story = this.content.aboutStory();
    const storyBody: SourceLocalizedText = {
      vi: toParagraphs(story.map((paragraph) => paragraph.vi)),
      en: toParagraphs(story.map((paragraph) => paragraph.en)),
    };
    const imageText = async (
      sectionKey: string,
      heading: SourceLocalizedText,
      body: SourceLocalizedText,
      image: string,
      alt: SourceLocalizedText,
      position: 'left' | 'right',
      eyebrow?: SourceLocalizedText,
    ) =>
      this.section(
        sectionKey,
        'image-text',
        buildSectionContent({
          text: { eyebrow, heading, body, imageAlt: alt },
          shared: { image: await this.image(image), imagePosition: position },
        }),
      );

    const team: ListItemSpec[] = [];
    for (const member of this.content.aboutTeamMembers()) {
      const name = { vi: member.name, en: member.name };
      team.push({
        id: member.id,
        shared: { image: await this.image(member.image) },
        text: { imageAlt: name, title: name, description: member.role },
      });
    }

    return [
      await this.heroSection({
        image: '/images/about/hero.jpg',
        eyebrow: this.text(`${page}.hero.eyebrow`),
        headline: joinLines(
          this.text(`${page}.hero.headlineLine1`),
          this.text(`${page}.hero.headlineLine2`),
        ),
        description: this.text(`${page}.hero.description`),
        alt: this.text(`${page}.hero.imageAlt`),
      }),
      await imageText(
        'story',
        joinLines(
          this.text(`${page}.story.headlineLine1`),
          this.text(`${page}.story.headlineLine2`),
        ),
        storyBody,
        '/images/about/office-1.jpg',
        this.text(`${page}.story.imageAlt`),
        'right',
        this.text(`${page}.story.eyebrow`),
      ),
      this.stats('stats', this.content.aboutStats()),
      await imageText(
        'vision',
        this.text(`${page}.visionMission.visionTitle`),
        { vi: toParagraphs([vision.description.vi]), en: toParagraphs([vision.description.en]) },
        vision.image,
        this.text(`${page}.visionMission.visionImageAlt`),
        'left',
      ),
      await imageText(
        'mission',
        this.text(`${page}.visionMission.missionTitle`),
        { vi: toParagraphs([mission.description.vi]), en: toParagraphs([mission.description.en]) },
        mission.image,
        this.text(`${page}.visionMission.missionImageAlt`),
        'right',
      ),
      this.section(
        'values',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.values.eyebrow`),
            heading: this.text(`${page}.values.heading`),
          },
          shared: { columns: '4' },
          lists: { items: this.valueItems(this.content.aboutValues(), 'value') },
        }),
      ),
      this.section(
        'team',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.team.eyebrow`),
            heading: this.text(`${page}.team.heading`),
            intro: this.text(`${page}.team.intro`),
          },
          shared: { columns: '4' },
          lists: { items: team },
        }),
      ),
      this.section(
        'offices',
        'offices',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.offices.eyebrow`),
            heading: this.text(`${page}.offices.heading`),
            intro: this.text(`${page}.offices.intro`),
          },
        }),
      ),
      this.cta(page),
    ];
  }

  private async contact(): Promise<SectionBlueprint[]> {
    const page = 'contactPage';
    const paragraph = (key: string): SourceLocalizedText => {
      const text = this.text(key);
      return { vi: toParagraphs([text.vi]), en: toParagraphs([text.en]) };
    };
    return [
      await this.heroSection({
        image: '/images/contact/office-banner.jpg',
        eyebrow: this.text(`${page}.hero.eyebrow`),
        headline: this.text(`${page}.hero.headline`),
        description: this.text(`${page}.hero.subtext`),
        alt: this.text(`${page}.hero.headline`),
      }),
      this.section(
        'contact-form',
        'contact-form',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.info.eyebrow`),
            heading: this.text(`${page}.info.heading`),
            description: this.text(`${page}.info.paragraph`),
          },
          shared: { showOffices: true },
        }),
      ),
      this.section(
        'availability',
        'card-grid',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.availability.eyebrow`),
            heading: this.text(`${page}.availability.heading`),
          },
          shared: { columns: '3' },
          lists: {
            items: CONTACT_AVAILABILITY_CARDS.map((card) => ({
              id: card.id,
              shared: { icon: card.icon },
              text: {
                title: this.text(card.titleKey),
                description: this.text(card.descriptionKey),
              },
            })),
          },
        }),
      ),
      this.section(
        'reach',
        'stats',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.reach.eyebrow`),
            heading: this.text(`${page}.reach.heading`),
            description: this.text(`${page}.reach.paragraph`),
          },
          lists: {
            items: CONTACT_REACH_STATS.map((stat) => ({
              id: stat.id,
              shared: { value: stat.value },
              text: { label: this.text(stat.labelKey) },
            })),
          },
        }),
      ),
      this.section(
        'faq',
        'faq',
        buildSectionContent({
          text: {
            eyebrow: this.text(`${page}.faq.eyebrow`),
            heading: this.text(`${page}.faq.heading`),
          },
          lists: {
            items: CONTACT_FAQ_KEYS.map((entry) => ({
              id: entry.id,
              text: {
                question: this.text(entry.questionKey),
                answer: paragraph(entry.answerKey),
              },
            })),
          },
        }),
      ),
    ];
  }
}
