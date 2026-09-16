export interface NavLink {
  label: string;
  href: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  thumbnail: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  techStack: string[];
  demoHref: string;
}

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  thumbnail: string;
  hasVideo: boolean;
  href: string;
}

export type WhyUsIcon = "bolt" | "shield" | "users" | "rocket";

export interface WhyUsItem {
  id: string;
  icon: WhyUsIcon;
  title: string;
  description: string;
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
