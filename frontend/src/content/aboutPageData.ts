import {
  AboutTeamMember,
  LocalizedText,
  ServiceCategoryStat,
  ServiceCategoryWhyUsItem,
} from "@/types";

// "Câu chuyện công ty" — 2 đoạn văn kể câu chuyện thành lập KhaiFrost.
export const aboutStoryParagraphs: LocalizedText[] = [
  {
    en: "KhaiFrost was founded by a team of tech-savvy engineers who share one belief: technology can only become a real force when it solves the practical problems businesses face every day.",
    vi: "KhaiFrost được thành lập bởi đội ngũ kỹ sư và chuyên gia công nghệ với chung một niềm tin: công nghệ chỉ có thể trở thành sức mạnh thực sự khi nó giải quyết được những bài toán thực tế của doanh nghiệp.",
  },
  {
    en: "We started from small projects, with the simple goal of delivering effective, flexible and easy-to-deploy technology solutions. Today, KhaiFrost has become a trusted partner to many businesses in the US and Vietnam, continuing the journey to bring AI, Cloud and Automation closer to every organization.",
    vi: "Chúng tôi bắt đầu từ những dự án nhỏ, với mục tiêu đơn giản là mang đến giải pháp công nghệ hiệu quả, linh hoạt và dễ triển khai. Ngày nay, KhaiFrost đã trở thành đối tác tin cậy của nhiều doanh nghiệp tại Mỹ và Việt Nam, tiếp tục hành trình mang công nghệ AI, Cloud và Automation đến gần hơn với mọi tổ chức.",
  },
];

// Dải số liệu ngang, tái dùng component CategoryStats.
export const aboutStats: ServiceCategoryStat[] = [
  {
    icon: "calendar",
    value: "2020",
    label: { en: "Founded In", vi: "Năm thành lập" },
    description: {
      en: "The year KhaiFrost began its journey",
      vi: "Năm KhaiFrost bắt đầu hành trình",
    },
  },
  {
    icon: "briefcase",
    value: "50+",
    label: { en: "Projects Delivered", vi: "Dự án đã triển khai" },
    description: {
      en: "Across AI, Cloud and Automation",
      vi: "Trải rộng AI, Cloud và Automation",
    },
  },
  {
    icon: "users",
    value: "100+",
    label: { en: "Clients Served", vi: "Khách hàng phục vụ" },
    description: {
      en: "From startups to large enterprises",
      vi: "Từ startup đến doanh nghiệp lớn",
    },
  },
  {
    icon: "globe",
    value: "2",
    label: { en: "Countries Present", vi: "Quốc gia có mặt" },
    description: {
      en: "United States and Vietnam",
      vi: "Hoa Kỳ và Việt Nam",
    },
  },
];

export const aboutVision = {
  image: "/images/about/vision.jpg",
  description: {
    en: "To become a leading regional technology company in AI, Cloud and Automation, delivering breakthrough solutions that help businesses grow sustainably and scale globally.",
    vi: "Trở thành công ty công nghệ hàng đầu khu vực về AI, Cloud và Automation, mang đến giải pháp đột phá giúp doanh nghiệp phát triển bền vững và vươn tầm toàn cầu.",
  } as LocalizedText,
};

export const aboutMission = {
  image: "/images/about/mission.jpg",
  description: {
    en: "To create smart, secure and easy-to-deploy technology solutions that help businesses optimize operations, strengthen their competitive edge and generate long-lasting value.",
    vi: "Kiến tạo các giải pháp công nghệ thông minh, an toàn và dễ triển khai, giúp doanh nghiệp tối ưu vận hành, nâng cao năng lực cạnh tranh và tạo ra giá trị lâu dài.",
  } as LocalizedText,
};

// "Giá trị cốt lõi" — tái dùng type ServiceCategoryWhyUsItem (icon, title, description).
export const aboutValues: ServiceCategoryWhyUsItem[] = [
  {
    icon: "rocket",
    title: { en: "Innovation", vi: "Đổi mới" },
    description: {
      en: "Always updating new technology, leading trends to deliver the best solutions.",
      vi: "Luôn cập nhật công nghệ mới, dẫn đầu xu hướng để mang lại giải pháp tốt nhất.",
    },
  },
  {
    icon: "shield",
    title: { en: "Transparency", vi: "Minh bạch" },
    description: {
      en: "Clear in process, cost and commitment with every client.",
      vi: "Rõ ràng trong quy trình, chi phí và cam kết với khách hàng.",
    },
  },
  {
    icon: "heart",
    title: { en: "Customer Devotion", vi: "Tận tâm với khách hàng" },
    description: {
      en: "Listening, understanding and accompanying clients throughout the journey.",
      vi: "Lắng nghe, thấu hiểu và đồng hành cùng khách hàng trong suốt hành trình.",
    },
  },
  {
    icon: "settings",
    title: { en: "Technical Quality", vi: "Chất lượng kỹ thuật" },
    description: {
      en: "Setting high standards in every line of code, every product, every project.",
      vi: "Đặt tiêu chuẩn cao trong từng dòng code, từng sản phẩm, từng dự án.",
    },
  },
];

// "Đội ngũ của chúng tôi" — dữ liệu mẫu tạm thời (tên/chức danh giữ theo mockup thiết kế).
export const aboutTeamMembers: AboutTeamMember[] = [
  {
    id: "team-1",
    name: "Nguyễn Minh Tân",
    role: { en: "CEO & Founder", vi: "CEO & Founder" },
    image: "/images/about/team-1.jpg",
  },
  {
    id: "team-2",
    name: "Trần Hoàng Anh",
    role: { en: "CTO", vi: "CTO" },
    image: "/images/about/team-2.jpg",
  },
  {
    id: "team-3",
    name: "Lê Thị Phương Anh",
    role: { en: "Head of Product", vi: "Head of Product" },
    image: "/images/about/team-3.jpg",
  },
  {
    id: "team-4",
    name: "Phạm Quốc Bảo",
    role: { en: "Head of Engineering", vi: "Head of Engineering" },
    image: "/images/about/team-4.jpg",
  },
];

// Ảnh minh hoạ thành phố cho từng văn phòng trong siteConfig.offices (map theo office id).
export const aboutOfficeImages: Record<string, string> = {
  "office-usa": "/images/about/office-houston.jpg",
  "office-vn": "/images/about/office-hcmc.jpg",
};
