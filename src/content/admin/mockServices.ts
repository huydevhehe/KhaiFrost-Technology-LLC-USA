export type ServiceStatus = "Active" | "Inactive";

export interface AdminService {
  id: string;
  name: string;
  category: string;
  status: ServiceStatus;
  description: string;
  coverImage: string;
}

export const serviceCategories = [
  "AI & Automation",
  "AWS Cloud & DevOps",
  "Managed Infrastructure",
  "Software & API Development",
];

export const mockServices: AdminService[] = [
  {
    id: "SVC-001",
    name: "AI & Automation",
    category: "AI & Automation",
    status: "Active",
    description: "Xây dựng giải pháp AI và tự động hoá quy trình doanh nghiệp.",
    coverImage: "/images/placeholders/project-1.jpg",
  },
  {
    id: "SVC-002",
    name: "AWS Cloud & DevOps",
    category: "AWS Cloud & DevOps",
    status: "Active",
    description: "Tư vấn, triển khai và vận hành hạ tầng AWS Cloud chuyên nghiệp.",
    coverImage: "/images/placeholders/project-2.jpg",
  },
  {
    id: "SVC-003",
    name: "Managed Infrastructure",
    category: "Managed Infrastructure",
    status: "Active",
    description: "Quản lý và giám sát hạ tầng CNTT liên tục cho doanh nghiệp.",
    coverImage: "/images/placeholders/project-3.jpg",
  },
  {
    id: "SVC-004",
    name: "Software & API Development",
    category: "Software & API Development",
    status: "Active",
    description: "Phát triển phần mềm và API tuỳ chỉnh theo yêu cầu.",
    coverImage: "/images/placeholders/project-1.jpg",
  },
];
