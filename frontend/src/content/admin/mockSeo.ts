export interface PageSeo {
  pageId: string;
  pageName: string;
  title: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
}

export const mockSeoSettings: PageSeo[] = [
  {
    pageId: "trang-chu",
    pageName: "Trang chủ",
    title: "KhaiFrost Technology LLC | AI & Cloud Solutions",
    metaDescription:
      "KhaiFrost Technology cung cấp giải pháp AI, Cloud và bảo mật cho doanh nghiệp hiện đại tại Houston và Việt Nam.",
    keywords: "AI, Cloud, Software, DevOps, KhaiFrost",
    ogImage: "/images/hero/hero-banner.jpg",
  },
  {
    pageId: "ve-chung-toi",
    pageName: "Về chúng tôi",
    title: "Về chúng tôi | KhaiFrost Technology LLC",
    metaDescription: "Tìm hiểu về đội ngũ và sứ mệnh của KhaiFrost Technology.",
    keywords: "KhaiFrost, đội ngũ, sứ mệnh, công nghệ",
    ogImage: "/images/about/hero.jpg",
  },
  {
    pageId: "dich-vu",
    pageName: "Dịch vụ",
    title: "Dịch vụ | KhaiFrost Technology LLC",
    metaDescription: "Khám phá các dịch vụ AI, Cloud, DevOps và phát triển phần mềm của KhaiFrost.",
    keywords: "dịch vụ AI, AWS, DevOps, phần mềm",
    ogImage: "/images/services-overview/hero.jpg",
  },
  {
    pageId: "lien-he",
    pageName: "Liên hệ",
    title: "Liên hệ | KhaiFrost Technology LLC",
    metaDescription: "Liên hệ với KhaiFrost Technology để được tư vấn giải pháp công nghệ phù hợp.",
    keywords: "liên hệ, tư vấn, KhaiFrost",
    ogImage: "/images/map/global-reach.jpg",
  },
];
