import { LocalizedText, ServiceCategoryFaqItem, ServiceCategoryProcessStep, ServiceCategoryWhyUsItem } from "@/types";

// "Vì sao chọn KhaiFrost" — tái dùng type ServiceCategoryWhyUsItem (icon, title, description).
export const careersBenefits: ServiceCategoryWhyUsItem[] = [
  {
    icon: "rocket",
    title: { en: "Real Projects, Real Impact", vi: "Dự án thật – tác động thật" },
    description: {
      en: "Work on genuine projects for enterprise clients across the US and Vietnam, solving technology problems that actually matter.",
      vi: "Tham gia các dự án thực tế cho khách hàng doanh nghiệp tại Mỹ và Việt Nam, giải quyết những bài toán công nghệ có giá trị.",
    },
  },
  {
    icon: "trendingUp",
    title: { en: "Fast Growth Path", vi: "Lộ trình phát triển nhanh" },
    description: {
      en: "Learn continuously, sharpen your skills, and grow with a clear, transparent individual development path.",
      vi: "Được học hỏi, rèn luyện kỹ năng chuyên môn và thăng tiến rõ ràng với lộ trình phát triển cá nhân minh bạch.",
    },
  },
  {
    icon: "globe",
    title: { en: "Working Across the US & Vietnam", vi: "Làm việc xuyên Mỹ – Việt" },
    description: {
      en: "Collaborate with a multinational team, gain international experience, and expand your global network.",
      vi: "Làm việc với đội ngũ đa quốc gia, tích lũy kinh nghiệm quốc tế và mở rộng mạng lưới toàn cầu.",
    },
  },
  {
    icon: "heart",
    title: { en: "Flexible & Trust-Based", vi: "Linh hoạt & tin tưởng nhau" },
    description: {
      en: "We value flexibility, autonomy, and trust in the ability of every team member.",
      vi: "Chúng tôi đề cao sự linh hoạt, tự chủ và tin tưởng vào năng lực của mỗi thành viên.",
    },
  },
];

export interface OpenPosition {
  id: string;
  title: LocalizedText;
  department: LocalizedText;
  location: LocalizedText;
  type: LocalizedText;
}

// Vị trí đang tuyển — cập nhật thủ công tại đây cho tới khi có màn quản trị riêng.
export const openPositions: OpenPosition[] = [
  {
    id: "backend-developer-java-springboot",
    title: { en: "Backend Developer (Java / Spring Boot)", vi: "Backend Developer (Java / Spring Boot)" },
    department: { en: "Engineering", vi: "Phòng Công nghệ" },
    location: { en: "Ho Chi Minh City, Vietnam", vi: "TP.HCM, Việt Nam" },
    type: { en: "Full-time", vi: "Toàn thời gian" },
  },
  {
    id: "frontend-developer-react",
    title: { en: "Frontend Developer (React)", vi: "Frontend Developer (React)" },
    department: { en: "Engineering", vi: "Phòng Công nghệ" },
    location: { en: "Ho Chi Minh City, Vietnam", vi: "TP.HCM, Việt Nam" },
    type: { en: "Full-time", vi: "Toàn thời gian" },
  },
  {
    id: "devops-engineer",
    title: { en: "DevOps Engineer", vi: "DevOps Engineer" },
    department: { en: "Infrastructure", vi: "Phòng Hạ tầng" },
    location: { en: "Houston, Texas, USA", vi: "Houston, Texas, USA" },
    type: { en: "Full-time", vi: "Toàn thời gian" },
  },
  {
    id: "ai-ml-engineer",
    title: { en: "AI/ML Engineer", vi: "AI/ML Engineer" },
    department: { en: "Engineering", vi: "Phòng Công nghệ" },
    location: { en: "Ho Chi Minh City, Vietnam", vi: "TP.HCM, Việt Nam" },
    type: { en: "Full-time", vi: "Toàn thời gian" },
  },
];

// "Chương trình Mentor" — quy trình 4 bước, tái dùng type ServiceCategoryProcessStep.
export const mentorProcessSteps: ServiceCategoryProcessStep[] = [
  {
    step: "1",
    icon: "fileText",
    title: { en: "Apply & orientation interview", vi: "Ứng tuyển & phỏng vấn định hướng" },
    description: {
      en: "We learn your goals, assess your skills, and find the right fit for you.",
      vi: "Tìm hiểu mục tiêu, đánh giá năng lực và định hướng phù hợp.",
    },
  },
  {
    step: "2",
    icon: "users",
    title: { en: "Paired with a mentor and project", vi: "Ghép cặp với mentor + dự án phù hợp" },
    description: {
      en: "Matched based on your skills and development goals.",
      vi: "Dựa trên kỹ năng và mục tiêu phát triển của bạn.",
    },
  },
  {
    step: "3",
    icon: "settings",
    title: { en: "Work directly on real infrastructure/projects", vi: "Làm việc trực tiếp trên hạ tầng/dự án thật" },
    description: {
      en: "Weekly code/infra reviews, with close, hands-on guidance.",
      vi: "Review code/infra hàng tuần, được hướng dẫn sát sao.",
    },
  },
  {
    step: "4",
    icon: "trendingUp",
    title: { en: "Evaluation & chance to join full-time", vi: "Đánh giá & cơ hội chuyển sang vị trí chính thức" },
    description: {
      en: "Based on your results and real-world performance.",
      vi: "Dựa trên kết quả và năng lực thực tế.",
    },
  },
];

export const mentorBenefits: LocalizedText[] = [
  {
    en: "1-on-1 mentorship from experienced senior engineers",
    vi: "Mentor 1-1 từ kỹ sư senior giàu kinh nghiệm",
  },
  {
    en: "Real projects to add to your CV (cloud, infrastructure, dev)",
    vi: "Dự án thật vào CV (cloud, hạ tầng, dev)",
  },
  {
    en: "A chance to move into a full-time role after the program",
    vi: "Cơ hội chuyển sang vị trí full-time sau chương trình",
  },
];

export const mentorFitFor: LocalizedText[] = [
  {
    en: "Final-year IT students",
    vi: "Sinh viên năm cuối ngành CNTT",
  },
  {
    en: "Junior developers (0-2 years of experience)",
    vi: "Junior developer (0-2 năm kinh nghiệm)",
  },
  {
    en: "Career switchers moving into cloud/DevOps",
    vi: "Người chuyển ngành sang cloud/devops",
  },
];

// "Về tuyển dụng" — cột FAQ bên trái.
export const careersFaqRecruitment: ServiceCategoryFaqItem[] = [
  {
    question: { en: "What positions does KhaiFrost hire for?", vi: "KhaiFrost có những vị trí tuyển dụng nào?" },
    answer: {
      en: "We regularly hire for Developer, AI Engineer, Cloud/DevOps and Cybersecurity roles — check the open positions list above for what's active right now.",
      vi: "Chúng tôi thường xuyên tuyển các vị trí Dev, AI Engineer, Cloud/DevOps, Cybersecurity... Xem danh sách vị trí đang tuyển ở trên để biết các vị trí đang mở.",
    },
  },
  {
    question: { en: "What does the application process look like?", vi: "Quy trình ứng tuyển diễn ra như thế nào?" },
    answer: {
      en: "Send us your CV, go through a short technical and culture-fit interview, then receive an offer — usually within 1-2 weeks.",
      vi: "Gửi CV, tham gia phỏng vấn ngắn về chuyên môn và văn hoá, sau đó nhận offer — thường trong vòng 1-2 tuần.",
    },
  },
  {
    question: { en: "Does the company support remote work?", vi: "Công ty có hỗ trợ làm việc từ xa không?" },
    answer: {
      en: "Yes, most roles support a flexible or hybrid setup — the details depend on the specific position and team.",
      vi: "Có, phần lớn các vị trí hỗ trợ làm việc linh hoạt hoặc hybrid — chi tiết tuỳ theo từng vị trí và đội ngũ cụ thể.",
    },
  },
  {
    question: { en: "What about salary and benefits?", vi: "Mức lương và chế độ phúc lợi ra sao?" },
    answer: {
      en: "Compensation is competitive and based on experience, with health benefits, performance reviews, and clear room to grow.",
      vi: "Mức lương cạnh tranh, dựa trên kinh nghiệm thực tế, kèm theo bảo hiểm sức khoẻ, đánh giá định kỳ và lộ trình thăng tiến rõ ràng.",
    },
  },
];

// "Về chương trình Mentor" — cột FAQ ở giữa.
export const careersFaqMentor: ServiceCategoryFaqItem[] = [
  {
    question: { en: "How long does the Mentor program run?", vi: "Chương trình Mentor kéo dài bao lâu?" },
    answer: {
      en: "Most cohorts run 3-6 months, depending on the project and how quickly you progress.",
      vi: "Thông thường kéo dài 3-6 tháng, tuỳ theo dự án và tốc độ tiến bộ của bạn.",
    },
  },
  {
    question: { en: "Do I need prior experience to join?", vi: "Có cần kinh nghiệm trước khi tham gia không?" },
    answer: {
      en: "No — we welcome students and career switchers. A solid technical foundation and a willingness to learn matter more than years of experience.",
      vi: "Không bắt buộc — chúng tôi chào đón cả sinh viên và người chuyển ngành. Nền tảng kỹ thuật vững và tinh thần chủ động học hỏi quan trọng hơn số năm kinh nghiệm.",
    },
  },
  {
    question: {
      en: "Is there a chance to become a full-time employee after the program?",
      vi: "Sau khi hoàn thành có cơ hội trở thành nhân viên chính thức không?",
    },
    answer: {
      en: "Yes — strong performers are considered for open full-time positions once they complete the program.",
      vi: "Có — những bạn thể hiện tốt sẽ được xem xét cho các vị trí full-time đang tuyển sau khi hoàn thành chương trình.",
    },
  },
  {
    question: { en: "Is there a cost to join the program?", vi: "Chi phí tham gia chương trình là bao nhiêu?" },
    answer: {
      en: "The program is completely free — it's an investment we make in future talent, not a paid course.",
      vi: "Chương trình hoàn toàn miễn phí — đây là khoản đầu tư của chúng tôi cho nhân tài tương lai, không phải khoá học trả phí.",
    },
  },
];
