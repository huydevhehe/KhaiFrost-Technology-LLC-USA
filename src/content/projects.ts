import { Project } from "@/types";

export const projects: Project[] = [
  {
    id: "p1",
    title: { en: "AI Code Assistant", vi: "Trợ lý lập trình AI" },
    description: {
      en: "Intelligent coding companion with context-aware suggestions and real-time help.",
      vi: "Trợ lý lập trình thông minh với gợi ý theo ngữ cảnh và hỗ trợ theo thời gian thực.",
    },
    thumbnail: "/images/placeholders/project-1.svg",
    techStack: ["Next.js", "TypeScript", "OpenAI"],
    demoHref: "#",
  },
  {
    id: "p2",
    title: { en: "Hotel Booking Platform", vi: "Nền tảng đặt phòng khách sạn" },
    description: {
      en: "Modern booking system with AI recommendations and seamless user experience.",
      vi: "Hệ thống đặt phòng hiện đại với gợi ý AI và trải nghiệm người dùng mượt mà.",
    },
    thumbnail: "/images/placeholders/project-2.svg",
    techStack: ["React", "Node.js", "PostgreSQL"],
    demoHref: "#",
  },
  {
    id: "p3",
    title: { en: "Data Analytics Dashboard", vi: "Bảng điều khiển phân tích dữ liệu" },
    description: {
      en: "Real-time data visualization and business intelligence for smarter decisions.",
      vi: "Trực quan hoá dữ liệu thời gian thực và phân tích kinh doanh giúp ra quyết định thông minh hơn.",
    },
    thumbnail: "/images/placeholders/project-3.svg",
    techStack: ["React", "Python", "Supabase"],
    demoHref: "#",
  },
];
