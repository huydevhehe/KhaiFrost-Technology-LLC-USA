export type PostStatus = "Draft" | "Published";

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  category: string;
  status: PostStatus;
  updatedDate: string;
  publishDate: string;
  excerptVi: string;
  excerptEn: string;
  contentVi: string;
  contentEn: string;
}

export const blogCategories = [
  "AI & Automation",
  "Cloud & DevOps",
  "Bảo mật",
  "Chuỗi lạnh",
  "Doanh nghiệp",
];

export const mockBlogPosts: AdminBlogPost[] = [
  {
    id: "POST-001",
    title: "Xu hướng AI trong sản xuất công nghiệp 2025",
    slug: "xu-huong-ai-trong-san-xuat-cong-nghiep-2025",
    coverImage: "/images/placeholders/blog-1.jpg",
    category: "AI & Automation",
    status: "Published",
    updatedDate: "12/05/2025",
    publishDate: "10/05/2025",
    excerptVi: "Khám phá các xu hướng ứng dụng AI mới nhất trong ngành sản xuất công nghiệp.",
    excerptEn: "Explore the latest AI application trends in industrial manufacturing.",
    contentVi: "Nội dung chi tiết về xu hướng AI trong sản xuất công nghiệp...",
    contentEn: "Detailed content about AI trends in industrial manufacturing...",
  },
  {
    id: "POST-002",
    title: "Hệ thống chuỗi cung ứng thông minh",
    slug: "he-thong-chuoi-cung-ung-thong-minh",
    coverImage: "/images/placeholders/blog-2.jpg",
    category: "Doanh nghiệp",
    status: "Published",
    updatedDate: "03/05/2025",
    publishDate: "01/05/2025",
    excerptVi: "Ứng dụng công nghệ để tối ưu hóa chuỗi cung ứng lạnh.",
    excerptEn: "Applying technology to optimize the cold supply chain.",
    contentVi: "Nội dung chi tiết về chuỗi cung ứng thông minh...",
    contentEn: "Detailed content about smart supply chains...",
  },
  {
    id: "POST-003",
    title: "Bảo mật dữ liệu doanh nghiệp trong kỷ nguyên số",
    slug: "bao-mat-du-lieu-doanh-nghiep",
    coverImage: "/images/placeholders/blog-3.jpg",
    category: "Bảo mật",
    status: "Draft",
    updatedDate: "09/06/2025",
    publishDate: "—",
    excerptVi: "Các giải pháp bảo mật dữ liệu hiện đại cho doanh nghiệp.",
    excerptEn: "Modern data security solutions for enterprises.",
    contentVi: "Nội dung chi tiết về bảo mật dữ liệu...",
    contentEn: "Detailed content about data security...",
  },
  {
    id: "POST-004",
    title: "Lịch sử tủ đông bay hơi",
    slug: "lich-su-tu-dong-bay-hoi",
    coverImage: "/images/placeholders/blog-4.jpg",
    category: "Chuỗi lạnh",
    status: "Published",
    updatedDate: "20/04/2025",
    publishDate: "18/04/2025",
    excerptVi: "Tìm hiểu lịch sử phát triển của công nghệ tủ đông bay hơi.",
    excerptEn: "A look into the history of evaporative freezer technology.",
    contentVi: "Nội dung chi tiết về lịch sử tủ đông bay hơi...",
    contentEn: "Detailed content about evaporative freezer history...",
  },
  {
    id: "POST-005",
    title: "KhaiFrost - Công nghệ chuỗi lạnh cho tương lai",
    slug: "khaifrost-cong-nghe-chuoi-lanh",
    coverImage: "/images/placeholders/blog-1.jpg",
    category: "Chuỗi lạnh",
    status: "Published",
    updatedDate: "28/04/2025",
    publishDate: "24/04/2025",
    excerptVi: "KhaiFrost mang đến giải pháp công nghệ chuỗi lạnh toàn diện.",
    excerptEn: "KhaiFrost delivers comprehensive cold-chain technology solutions.",
    contentVi: "Nội dung chi tiết về KhaiFrost và chuỗi lạnh...",
    contentEn: "Detailed content about KhaiFrost and cold chain...",
  },
];
