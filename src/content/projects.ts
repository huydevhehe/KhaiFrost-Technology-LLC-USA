import { Project } from "@/types";

export const projects: Project[] = [
  {
    id: "p1",
    title: "AI Code Assistant",
    description:
      "Intelligent coding companion with context-aware suggestions and real-time help.",
    thumbnail: "/images/placeholders/project-1.svg",
    techStack: ["Next.js", "TypeScript", "OpenAI"],
    demoHref: "#",
  },
  {
    id: "p2",
    title: "Hotel Booking Platform",
    description:
      "Modern booking system with AI recommendations and seamless user experience.",
    thumbnail: "/images/placeholders/project-2.svg",
    techStack: ["React", "Node.js", "PostgreSQL"],
    demoHref: "#",
  },
  {
    id: "p3",
    title: "Data Analytics Dashboard",
    description:
      "Real-time data visualization and business intelligence for smarter decisions.",
    thumbnail: "/images/placeholders/project-3.svg",
    techStack: ["React", "Python", "Supabase"],
    demoHref: "#",
  },
];
