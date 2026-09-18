import { Project } from "@/types";

// Canonical list of showcased projects, used across the homepage
// ("Featured Projects"), /dich-vu ("Featured Projects" grid) and the
// dedicated /du-an (portfolio) page. Content matches the approved
// "design dự án trang khám phá.png" mockup for /du-an, which is the main
// page displaying these 6 projects.
export const projects: Project[] = [
  {
    id: "p1",
    title: {
      en: "AI Receptionist - Salon & Dental",
      vi: "AI Lễ Tân - Salon & Nha Khoa",
    },
    description: {
      en: "AI assistant that answers calls, texts and books appointments automatically, helping businesses save 70% of their customer service time.",
      vi: "Trợ lý AI trả lời điện thoại, nhắn tin và đặt lịch tự động, giúp doanh nghiệp tiết kiệm 70% thời gian chăm sóc khách hàng.",
    },
    thumbnail: "/images/projects-page/ai-receptionist.jpg",
    techStack: ["OpenAI", "Twilio", "Next.js"],
    demoHref: "/lien-he",
    categoryLabel: { en: "AI & Automation", vi: "AI & Tự động hoá" },
    hasVideo: true,
    videoDuration: "02:32",
  },
  {
    id: "p2",
    title: {
      en: "Cloud Migration for E-commerce",
      vi: "Di Chuyển Hạ Tầng Lên Cloud Cho E-commerce",
    },
    description: {
      en: "Migrated infrastructure to AWS, optimizing cost and operating performance for an e-commerce platform with 99.9% uptime.",
      vi: "Di chuyển hạ tầng lên AWS, tối ưu chi phí và hiệu suất vận hành cho hệ thống thương mại điện tử với 99.9% uptime.",
    },
    thumbnail: "/images/projects-page/cloud-migration.jpg",
    techStack: ["AWS", "Terraform", "Docker"],
    demoHref: "/lien-he",
    categoryLabel: { en: "AWS Cloud & DevOps", vi: "AWS Cloud & DevOps" },
  },
  {
    id: "p3",
    title: {
      en: "Security Operations Center (SOC)",
      vi: "Trung Tâm Giám Sát An Ninh Mạng (SOC)",
    },
    description: {
      en: "24/7 system monitoring and protection, detecting risks early and preventing cyberattacks for businesses.",
      vi: "Giám sát và bảo vệ hệ thống 24/7, phát hiện sớm rủi ro và ngăn chặn tấn công mạng cho doanh nghiệp.",
    },
    thumbnail: "/images/projects-page/security-operations-center.jpg",
    techStack: ["SIEM", "Zero Trust", "AWS"],
    demoHref: "/lien-he",
    categoryLabel: {
      en: "Managed Infrastructure & Cybersecurity",
      vi: "Quản lý hạ tầng & An ninh mạng",
    },
  },
  {
    id: "p4",
    title: { en: "Custom CRM Platform", vi: "Nền Tảng CRM Tuỳ Chỉnh" },
    description: {
      en: "Developed a custom CRM system with multi-channel integration and automated sales workflows.",
      vi: "Phát triển hệ thống CRM theo yêu cầu, tích hợp đa kênh và tự động hoá quy trình bán hàng.",
    },
    thumbnail: "/images/projects-page/custom-crm.jpg",
    techStack: ["React", "Node.js", "PostgreSQL"],
    demoHref: "/lien-he",
    categoryLabel: {
      en: "Software & API Development",
      vi: "Phát triển phần mềm & API",
    },
  },
  {
    id: "p5",
    title: {
      en: "AI Chatbot for Customer Support",
      vi: "AI Chatbot Hỗ Trợ Khách Hàng",
    },
    description: {
      en: "Multi-channel chatbot (Web, Zalo, Messenger) supporting customers 24/7, reducing 60% of the workload for the support team.",
      vi: "Chatbot đa kênh (Web, Zalo, Messenger) hỗ trợ khách hàng 24/7, giảm 60% khối lượng công việc cho đội ngũ CSKH.",
    },
    thumbnail: "/images/projects-page/ai-chatbot.jpg",
    techStack: ["OpenAI", "LangChain", "Next.js"],
    demoHref: "/lien-he",
    categoryLabel: { en: "AI & Automation", vi: "AI & Tự động hoá" },
  },
  {
    id: "p6",
    title: {
      en: "Infrastructure as Code (IaC)",
      vi: "Tự Động Hoá Hạ Tầng (IaC)",
    },
    description: {
      en: "Automated infrastructure with Terraform, enabling faster, more stable deployments that are easy to scale.",
      vi: "Tự động hoá hạ tầng với Terraform, giúp triển khai nhanh hơn, ổn định hơn và dễ dàng mở rộng.",
    },
    thumbnail: "/images/projects-page/infrastructure-as-code.jpg",
    techStack: ["Terraform", "AWS", "CI/CD"],
    demoHref: "/lien-he",
    categoryLabel: { en: "AWS Cloud & DevOps", vi: "AWS Cloud & DevOps" },
  },
];
