import { ServiceItem } from "@/types";

export const services: ServiceItem[] = [
  {
    id: "s1",
    slug: "ai-automation",
    icon: "ai",
    title: { en: "AI & Automation", vi: "AI & Tự động hoá" },
    description: {
      en: "AI-powered tools that automate workflows and boost productivity.",
      vi: "Công cụ AI tự động hoá quy trình làm việc và tăng năng suất.",
    },
    image: "/images/services/ai-automation.jpg",
  },
  {
    id: "s2",
    slug: "aws-cloud-devops",
    icon: "cloud",
    title: { en: "AWS Cloud & DevOps", vi: "AWS Cloud & DevOps" },
    description: {
      en: "Scalable cloud architecture and CI/CD pipelines on AWS.",
      vi: "Kiến trúc cloud có khả năng mở rộng và pipeline CI/CD trên AWS.",
    },
    image: "/images/services/aws-cloud.jpg",
  },
  {
    id: "s3",
    slug: "cybersecurity",
    icon: "security",
    title: {
      en: "Managed Infrastructure & Cybersecurity",
      vi: "Quản lý hạ tầng & An ninh mạng",
    },
    description: {
      en: "24/7 monitoring and hardened security for your systems.",
      vi: "Giám sát 24/7 và bảo mật tăng cường cho hệ thống của bạn.",
    },
    image: "/images/services/cybersecurity.jpg",
  },
  {
    id: "s4",
    slug: "software-api-development",
    icon: "code",
    title: { en: "Software & API Development", vi: "Phát triển phần mềm & API" },
    description: {
      en: "Custom software and robust APIs built to scale.",
      vi: "Phần mềm tuỳ chỉnh và API mạnh mẽ, sẵn sàng mở rộng.",
    },
    image: "/images/services/software-api.jpg",
  },
];
