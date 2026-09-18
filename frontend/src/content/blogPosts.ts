import { BlogPost } from "@/types";

export const blogPosts: BlogPost[] = [
  {
    id: "b1",
    title: {
      en: "Getting Started with Next.js 14 App Router",
      vi: "Bắt đầu với Next.js 14 App Router",
    },
    excerpt: {
      en: "A practical walkthrough of routing, layouts and server components for teams migrating from the Pages Router.",
      vi: "Hướng dẫn thực tế về routing, layout và server components dành cho các đội đang chuyển từ Pages Router.",
    },
    date: "Aug 29, 2025",
    thumbnail: "/images/placeholders/blog-1.jpg",
    hasVideo: true,
    href: "#",
  },
  {
    id: "b2",
    title: {
      en: "The Future of AI in Web Development",
      vi: "Tương lai của AI trong phát triển web",
    },
    excerpt: {
      en: "How AI copilots, code generation and automated testing are reshaping the daily workflow of modern dev teams.",
      vi: "AI copilot, sinh code tự động và kiểm thử tự động đang thay đổi quy trình làm việc hàng ngày của các đội phát triển hiện đại như thế nào.",
    },
    date: "Aug 18, 2025",
    thumbnail: "/images/placeholders/blog-2.jpg",
    hasVideo: true,
    href: "#",
  },
  {
    id: "b3",
    title: {
      en: "Clean Code Practices for Better Maintainability",
      vi: "Thực hành Clean Code để dễ bảo trì hơn",
    },
    excerpt: {
      en: "Naming, function size and dependency boundaries — small habits that keep a codebase easy to change a year from now.",
      vi: "Đặt tên, kích thước hàm và ranh giới phụ thuộc — những thói quen nhỏ giúp codebase dễ thay đổi ngay cả một năm sau.",
    },
    date: "Aug 12, 2025",
    thumbnail: "/images/placeholders/blog-3.jpg",
    hasVideo: true,
    href: "#",
  },
  {
    id: "b4",
    title: {
      en: "Building Scalable Systems for Modern Businesses",
      vi: "Xây dựng hệ thống có khả năng mở rộng cho doanh nghiệp hiện đại",
    },
    excerpt: {
      en: "Architecture patterns that let infrastructure grow with demand instead of being rebuilt every time traffic spikes.",
      vi: "Các mẫu kiến trúc giúp hạ tầng tăng trưởng theo nhu cầu thay vì phải xây lại mỗi khi lượng truy cập tăng vọt.",
    },
    date: "Aug 5, 2025",
    thumbnail: "/images/placeholders/blog-4.jpg",
    hasVideo: true,
    href: "#",
  },
];
