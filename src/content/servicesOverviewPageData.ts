import { ServiceCategoryProcessStep, ServiceCategoryStat } from "@/types";

// Data for the /dich-vu (services overview) page's stats strip and process
// section. Kept separate from serviceCategoryDetails.ts since this data
// belongs to the overview page, not to any single service category.
export const servicesOverviewStats: ServiceCategoryStat[] = [
  {
    icon: "rocket",
    value: "50+",
    label: { en: "Projects Delivered", vi: "Dự án đã triển khai" },
    description: {
      en: "From startups to large enterprises",
      vi: "Từ startup đến doanh nghiệp lớn",
    },
  },
  {
    icon: "clock",
    value: "5+",
    label: { en: "Years of Experience", vi: "Năm kinh nghiệm" },
    description: {
      en: "In the technology field",
      vi: "Trong lĩnh vực công nghệ",
    },
  },
  {
    icon: "users",
    value: "100+",
    label: { en: "Clients Served", vi: "Khách hàng đang phục vụ" },
    description: {
      en: "Across many countries and industries",
      vi: "Tại nhiều quốc gia và ngành nghề",
    },
  },
  {
    icon: "trendingUp",
    value: "98%",
    label: { en: "Satisfaction Rate", vi: "Tỷ lệ hài lòng" },
    description: {
      en: "From clients and partners",
      vi: "Từ khách hàng và đối tác",
    },
  },
];

export const servicesOverviewProcessSteps: ServiceCategoryProcessStep[] = [
  {
    step: "01",
    icon: "search",
    title: { en: "Understand Your Needs", vi: "Tìm hiểu nhu cầu" },
    description: {
      en: "Analyze your goals, assess the current state and advise the right solution.",
      vi: "Phân tích mục tiêu, đánh giá hiện trạng và tư vấn giải pháp phù hợp.",
    },
  },
  {
    step: "02",
    icon: "lightbulb",
    title: { en: "Propose A Solution", vi: "Đề xuất giải pháp" },
    description: {
      en: "Design the architecture and a detailed implementation roadmap.",
      vi: "Thiết kế kiến trúc, lộ trình triển khai chi tiết.",
    },
  },
  {
    step: "03",
    icon: "settings",
    title: { en: "Implement", vi: "Triển khai" },
    description: {
      en: "Develop, integrate and test to ensure quality.",
      vi: "Phát triển, tích hợp và kiểm thử đảm bảo chất lượng.",
    },
  },
  {
    step: "04",
    icon: "headset",
    title: { en: "Long-Term Support", vi: "Hỗ trợ dài hạn" },
    description: {
      en: "Monitor, maintain and continuously optimize for lasting results.",
      vi: "Giám sát, bảo trì và tối ưu liên tục để đảm bảo hiệu quả lâu dài.",
    },
  },
];
