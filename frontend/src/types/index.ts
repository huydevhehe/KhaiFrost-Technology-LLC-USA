export interface LocalizedText {
  en: string;
  vi: string;
}

export interface NavLink {
  key: "home" | "service" | "discover" | "about" | "contact";
  href: string;
}

export interface Testimonial {
  id: string;
  quote: LocalizedText;
  name: string;
  role: string;
  thumbnail: string;
}

export interface Project {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  techStack: string[];
  demoHref: string;
  // Optional small category pill shown on video-thumbnail cards
  // (e.g. services overview page's "Featured Projects" section).
  categoryLabel?: LocalizedText;
  // Optional video badge shown on the /du-an (projects) page's card grid.
  hasVideo?: boolean;
  videoDuration?: string;
  // Slug of the project category when the project comes from the API.
  categorySlug?: string;
}

export interface BlogPost {
  id: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  date: string;
  thumbnail: string;
  hasVideo: boolean;
  href: string;
}

export type WhyUsIcon = "bolt" | "shield" | "users" | "rocket";

export type ServiceIcon = "ai" | "cloud" | "security" | "code";

export interface ServiceItem {
  id: string;
  slug: string;
  icon: ServiceIcon;
  title: LocalizedText;
  description: LocalizedText;
  image: string;
}

export interface WhyUsItem {
  id: string;
  icon: WhyUsIcon;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ClientLocation {
  id: string;
  name: string;
  role: string;
  country: string;
  quote: LocalizedText;
  avatar: string;
  coverImage: string;
  x: number;
  y: number;
}

export interface SocialLink {
  label: "GitHub" | "LinkedIn" | "X";
  href: string;
}

export interface OfficeLocation {
  id: string;
  label: LocalizedText;
  street: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  countryCode: string;
  x: number;
  y: number;
}

export interface SiteConfig {
  email: string;
  phone: string;
  address: string;
  offices: OfficeLocation[];
  socialLinks: SocialLink[];
}

// Generic icon set usable by any service category page (Category* components).
// Keep this list generic (not tied to a specific category's meaning).
export type CategoryIcon =
  | "rocket"
  | "trendingUp"
  | "clock"
  | "users"
  | "search"
  | "lightbulb"
  | "settings"
  | "lineChart"
  | "briefcase"
  | "bolt"
  | "shield"
  | "headset"
  | "eye"
  | "target"
  | "calendar"
  | "globe"
  | "heart";

export interface ServiceCategoryStat {
  icon: CategoryIcon;
  value: string;
  label: LocalizedText;
  description: LocalizedText;
}

export interface ServiceCategoryProduct {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  duration: string;
  tags: string[];
  href: string;
}

export interface ServiceCategoryProcessStep {
  step: string;
  icon: CategoryIcon;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ServiceCategoryWhyUsItem {
  icon: CategoryIcon;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ServiceCategoryCaseStudy {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  duration: string;
  tags: string[];
}

export interface ServiceCategoryTestimonial {
  id: string;
  quote: LocalizedText;
  name: string;
  role: string;
  avatar: string;
}

export interface ServiceCategoryPartnerBanner {
  label: LocalizedText;
  heading: LocalizedText;
  text: LocalizedText;
  ctaLabel: LocalizedText;
  ctaHref: string;
  image: string;
}

export interface ServiceCategoryFaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}

// "Về chúng tôi" (about) page: team member card data.
export interface AboutTeamMember {
  id: string;
  name: string;
  role: LocalizedText;
  image: string;
}

// Generic shape for a service category detail page (/dich-vu/[slug]).
// Any service category (AI & Automation, AWS Cloud & DevOps, Managed
// Infrastructure & Cybersecurity, Software & API Development, or future ones
// added via Admin Backend) is described by this same shape.
export interface ServiceCategoryDetail {
  slug: string;
  // Short category name (e.g. "AI & Automation") used in the breadcrumb and
  // in generic headings that mention the category (e.g. "Why choose
  // KhaiFrost for {categoryName}?"). Distinct from heroTitle, which is the
  // full marketing headline shown in the hero section.
  categoryName: LocalizedText;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  heroImage: string;
  stats: ServiceCategoryStat[];
  productsEyebrow: LocalizedText;
  productsHeading: LocalizedText;
  productsIntro: LocalizedText;
  products: ServiceCategoryProduct[];
  process: ServiceCategoryProcessStep[];
  whyUs: ServiceCategoryWhyUsItem[];
  caseStudies: ServiceCategoryCaseStudy[];
  testimonials: ServiceCategoryTestimonial[];
  partnerBanner?: ServiceCategoryPartnerBanner;
  faq: ServiceCategoryFaqItem[];
}
