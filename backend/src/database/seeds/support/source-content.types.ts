// Shapes of the frontend content files; declared here so the backend never imports frontend code

export interface SourceLocalizedText {
  en: string;
  vi: string;
}

export interface SourceService {
  id: string;
  slug: string;
  icon: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
  image: string;
}

export interface SourceWhyUsItem {
  id: string;
  icon: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
}

export interface SourceStat {
  icon: string;
  value: string;
  label: SourceLocalizedText;
  description: SourceLocalizedText;
}

export interface SourceProcessStep {
  step: string;
  icon: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
}

export interface SourceCategoryProduct {
  id: string;
  name: SourceLocalizedText;
  description: SourceLocalizedText;
  image: string;
  duration: string;
  tags: string[];
  href: string;
}

export interface SourceCategoryWhyUsItem {
  icon: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
}

export interface SourceCaseStudy {
  id: string;
  name: SourceLocalizedText;
  description: SourceLocalizedText;
  image: string;
  duration: string;
  tags: string[];
}

export interface SourceCategoryTestimonial {
  id: string;
  quote: SourceLocalizedText;
  name: string;
  role: string;
  avatar: string;
}

export interface SourcePartnerBanner {
  label: SourceLocalizedText;
  heading: SourceLocalizedText;
  text: SourceLocalizedText;
  ctaLabel: SourceLocalizedText;
  ctaHref: string;
  image: string;
}

export interface SourceFaqItem {
  question: SourceLocalizedText;
  answer: SourceLocalizedText;
}

export interface SourceServiceCategoryDetail {
  slug: string;
  categoryName: SourceLocalizedText;
  heroTitle: SourceLocalizedText;
  heroSubtitle: SourceLocalizedText;
  heroImage: string;
  stats: SourceStat[];
  productsEyebrow: SourceLocalizedText;
  productsHeading: SourceLocalizedText;
  productsIntro: SourceLocalizedText;
  products: SourceCategoryProduct[];
  process: SourceProcessStep[];
  whyUs: SourceCategoryWhyUsItem[];
  caseStudies: SourceCaseStudy[];
  testimonials: SourceCategoryTestimonial[];
  partnerBanner?: SourcePartnerBanner;
  faq: SourceFaqItem[];
}

export interface SourceProject {
  id: string;
  title: SourceLocalizedText;
  description: SourceLocalizedText;
  thumbnail: string;
  techStack: string[];
  demoHref: string;
  categoryLabel?: SourceLocalizedText;
  hasVideo?: boolean;
  videoDuration?: string;
}

export interface SourceBlogPost {
  id: string;
  title: SourceLocalizedText;
  excerpt: SourceLocalizedText;
  date: string;
  thumbnail: string;
  hasVideo: boolean;
  href: string;
}

export interface SourceTestimonial {
  id: string;
  quote: SourceLocalizedText;
  name: string;
  role: string;
  thumbnail: string;
}

export interface SourceClientLocation {
  id: string;
  name: string;
  role: string;
  country: string;
  quote: SourceLocalizedText;
  avatar: string;
  coverImage: string;
  x: number;
  y: number;
}

export interface SourceOffice {
  id: string;
  label: SourceLocalizedText;
  street: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  countryCode: string;
  x: number;
  y: number;
}

export interface SourceSiteConfig {
  email: string;
  phone: string;
  address: string;
  offices: SourceOffice[];
  socialLinks: { label: string; href: string }[];
}

export interface SourceNavLink {
  key: string;
  href: string;
}

export interface SourceCompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export interface SourcePageSeo {
  pageId: string;
  pageName: string;
  title: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
}

export interface SourceAdminBlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
}

export interface SourceAboutTeamMember {
  id: string;
  name: string;
  role: SourceLocalizedText;
  image: string;
}

export interface SourceAboutImageBlock {
  image: string;
  description: SourceLocalizedText;
}

export type ResourceBundleJson = { [key: string]: string | ResourceBundleJson };
