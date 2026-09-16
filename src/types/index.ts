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
}

export interface BlogPost {
  id: string;
  title: LocalizedText;
  date: string;
  thumbnail: string;
  hasVideo: boolean;
  href: string;
}

export type WhyUsIcon = "bolt" | "shield" | "users" | "rocket";

export type ServiceIcon = "ai" | "cloud" | "security" | "code";

export interface ServiceItem {
  id: string;
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
  x: number;
  y: number;
}

export interface SocialLink {
  label: "GitHub" | "LinkedIn" | "X";
  href: string;
}

export interface SiteConfig {
  email: string;
  phone: string;
  address: string;
  socialLinks: SocialLink[];
}
