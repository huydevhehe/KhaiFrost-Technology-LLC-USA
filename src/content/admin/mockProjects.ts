export const projectCategories = [
  "AI & Automation",
  "AWS Cloud & DevOps",
  "Security Operations",
  "Software Development",
];

export interface AdminProject {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  gallery: string[];
}

export const mockProjects: AdminProject[] = [
  {
    id: "PRJ-001",
    title: "AI Receptionist",
    description: "Trợ lý AI tiếp tân tự động cho doanh nghiệp, hỗ trợ đặt lịch và trả lời câu hỏi 24/7.",
    category: "AI & Automation",
    thumbnail: "/images/placeholders/project-1.jpg",
    gallery: ["/images/placeholders/project-1.jpg", "/images/placeholders/project-2.jpg"],
  },
  {
    id: "PRJ-002",
    title: "AWS Cloud Migration",
    description: "Di chuyển hạ tầng doanh nghiệp lên AWS Cloud với thời gian gián đoạn tối thiểu.",
    category: "AWS Cloud & DevOps",
    thumbnail: "/images/placeholders/project-2.jpg",
    gallery: ["/images/placeholders/project-2.jpg", "/images/placeholders/project-3.jpg"],
  },
  {
    id: "PRJ-003",
    title: "Security Operations Center",
    description: "Trung tâm giám sát an ninh mạng 24/7 cho các doanh nghiệp vừa và lớn.",
    category: "Security Operations",
    thumbnail: "/images/placeholders/project-3.jpg",
    gallery: ["/images/placeholders/project-3.jpg", "/images/placeholders/project-1.jpg"],
  },
  {
    id: "PRJ-004",
    title: "CRM Platform",
    description: "Nền tảng CRM tuỳ chỉnh giúp quản lý khách hàng và quy trình bán hàng.",
    category: "Software Development",
    thumbnail: "/images/placeholders/project-1.jpg",
    gallery: ["/images/placeholders/project-1.jpg"],
  },
  {
    id: "PRJ-005",
    title: "Customer Support Chatbot",
    description: "Chatbot hỗ trợ khách hàng tích hợp AI, giảm tải cho đội ngũ CSKH.",
    category: "AI & Automation",
    thumbnail: "/images/placeholders/project-2.jpg",
    gallery: ["/images/placeholders/project-2.jpg"],
  },
  {
    id: "PRJ-006",
    title: "IaC Infrastructure",
    description: "Triển khai hạ tầng dưới dạng mã (Infrastructure as Code) cho vận hành ổn định.",
    category: "AWS Cloud & DevOps",
    thumbnail: "/images/placeholders/project-3.jpg",
    gallery: ["/images/placeholders/project-3.jpg"],
  },
];
