import { ServiceCategoryStat } from "@/types";

// Stats strip data for the /du-an (projects) page, reusing the generic
// CategoryStats component. Kept separate from projects.ts since this data
// belongs to the page layout, not to any single project.
export const projectsPageStats: ServiceCategoryStat[] = [
  {
    icon: "rocket",
    value: "50+",
    label: { en: "Projects Delivered", vi: "Dự án đã triển khai" },
    description: {
      en: "Across AI, Cloud and Automation",
      vi: "Trải rộng AI, Cloud và Automation",
    },
  },
  {
    icon: "users",
    value: "15+",
    label: { en: "Industries Served", vi: "Ngành nghề đã phục vụ" },
    description: {
      en: "From retail to healthcare and finance",
      vi: "Từ bán lẻ đến y tế và tài chính",
    },
  },
  {
    icon: "lineChart",
    value: "10+",
    label: { en: "Technologies Used", vi: "Công nghệ sử dụng" },
    description: {
      en: "Modern, reliable technology stacks",
      vi: "Công nghệ hiện đại, đáng tin cậy",
    },
  },
  {
    icon: "heart",
    value: "98%",
    label: {
      en: "Customer Satisfaction Rate",
      vi: "Tỷ lệ hài lòng của khách hàng",
    },
    description: {
      en: "From clients and partners",
      vi: "Từ khách hàng và đối tác",
    },
  },
];
