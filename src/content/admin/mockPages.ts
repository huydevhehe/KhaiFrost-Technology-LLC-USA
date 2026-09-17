export interface PageSection {
  id: string;
  name: string;
  heading: string;
  subheading: string;
  body: string;
  image: string;
}

export interface AdminPage {
  id: string;
  name: string;
  sections: PageSection[];
}

export const mockPages: AdminPage[] = [
  {
    id: "trang-chu",
    name: "Trang chủ",
    sections: [
      {
        id: "hero",
        name: "Hero Section",
        heading: "Build Smarter. Grow Faster.",
        subheading: "KhaiFrost Technology — AI & Cloud Solutions",
        body: "Chúng tôi cung cấp giải pháp công nghệ AI, tự động hoá và hạ tầng đám mây cho doanh nghiệp hiện đại.",
        image: "/images/hero/hero-banner.jpg",
      },
      {
        id: "our-story",
        name: "Our Story",
        heading: "Câu chuyện của chúng tôi",
        subheading: "Từ ý tưởng đến giải pháp toàn cầu",
        body: "KhaiFrost được thành lập với sứ mệnh mang công nghệ tiên tiến đến gần hơn với doanh nghiệp vừa và nhỏ.",
        image: "/images/about/mission.jpg",
      },
      {
        id: "stats",
        name: "Stats",
        heading: "Con số ấn tượng",
        subheading: "Thành tựu của KhaiFrost qua các năm",
        body: "124 bài viết, 28 dự án hoàn thành, hơn 12,000 lượt truy cập mỗi tháng.",
        image: "",
      },
      {
        id: "featured-projects",
        name: "Featured Projects",
        heading: "Dự án tiêu biểu",
        subheading: "Một số dự án nổi bật của chúng tôi",
        body: "Khám phá các dự án AI, Cloud và bảo mật mà KhaiFrost đã triển khai thành công.",
        image: "/images/placeholders/project-1.jpg",
      },
      {
        id: "testimonials",
        name: "Testimonials",
        heading: "Khách hàng nói gì về chúng tôi",
        subheading: "Phản hồi thực tế từ đối tác",
        body: "Những chia sẻ chân thực từ khách hàng đã sử dụng dịch vụ của KhaiFrost.",
        image: "/images/placeholders/testimonial-1.jpg",
      },
      {
        id: "cta",
        name: "CTA",
        heading: "Sẵn sàng bắt đầu?",
        subheading: "Liên hệ với chúng tôi ngay hôm nay",
        body: "Đội ngũ KhaiFrost luôn sẵn sàng tư vấn giải pháp phù hợp nhất cho doanh nghiệp của bạn.",
        image: "",
      },
    ],
  },
  {
    id: "ve-chung-toi",
    name: "Về chúng tôi",
    sections: [
      {
        id: "about-hero",
        name: "Hero Section",
        heading: "Về KhaiFrost Technology",
        subheading: "Đội ngũ chuyên gia công nghệ toàn cầu",
        body: "KhaiFrost quy tụ đội ngũ kỹ sư và chuyên gia AI, Cloud giàu kinh nghiệm tại Houston và Việt Nam.",
        image: "/images/about/hero.jpg",
      },
      {
        id: "about-team",
        name: "Team",
        heading: "Đội ngũ của chúng tôi",
        subheading: "Những con người đứng sau thành công",
        body: "Gặp gỡ đội ngũ lãnh đạo và kỹ sư chủ chốt của KhaiFrost.",
        image: "/images/about/team-1.jpg",
      },
    ],
  },
  {
    id: "lien-he",
    name: "Liên hệ",
    sections: [
      {
        id: "contact-hero",
        name: "Hero Section",
        heading: "Liên hệ với KhaiFrost",
        subheading: "Chúng tôi luôn sẵn sàng lắng nghe",
        body: "Gửi yêu cầu tư vấn hoặc đặt lịch demo giải pháp công nghệ của KhaiFrost.",
        image: "",
      },
      {
        id: "our-reach",
        name: "Our Reach",
        heading: "Phạm vi hoạt động toàn cầu",
        subheading: "Văn phòng và khách hàng trên khắp thế giới",
        body: "KhaiFrost hiện có văn phòng tại Houston (Mỹ) và TP. Hồ Chí Minh (Việt Nam).",
        image: "/images/map/global-reach.jpg",
      },
    ],
  },
];
