// Texts the frontend does not have: the missing language of single language fields, and the article bodies

export const POST_BODY_PARAGRAPHS: Readonly<Record<string, { vi: string[]; en: string[] }>> = {
  b1: {
    en: [
      'The App Router changes how a Next.js application is organized. Instead of one file per page, routes are folders, and layouts, loading states and error boundaries live next to the pages they wrap.',
      'For teams coming from the Pages Router, the biggest shift is that components are server components by default. Data can be fetched directly where it is needed, and only the interactive parts of a screen are sent to the browser as client components.',
      'A practical way to migrate is to move one route at a time: keep the old pages in place, create the new route in the app directory, and retire the old file once the new one is verified. This keeps every release small and easy to roll back.',
    ],
    vi: [
      'App Router thay đổi cách tổ chức một ứng dụng Next.js. Thay vì mỗi trang là một tệp, mỗi route là một thư mục, còn layout, trạng thái loading và error boundary nằm ngay cạnh các trang mà chúng bao bọc.',
      'Với các đội đang dùng Pages Router, thay đổi lớn nhất là component mặc định chạy trên server. Dữ liệu có thể được lấy ngay tại nơi cần dùng, và chỉ những phần tương tác của màn hình mới được gửi xuống trình duyệt dưới dạng client component.',
      'Cách chuyển đổi thực tế là đi từng route một: giữ các trang cũ, tạo route mới trong thư mục app, rồi loại bỏ tệp cũ sau khi đã kiểm tra. Cách này giữ mỗi lần phát hành nhỏ và dễ hoàn tác.',
    ],
  },
  b2: {
    en: [
      'AI copilots now sit inside the editor and suggest code as developers type. Used well, they remove repetitive work such as boilerplate, data mapping and documentation, and leave more time for design decisions.',
      'Code generation and automated testing are changing the daily workflow of a development team. Tests can be drafted from existing code, and reviews can start from a machine-written summary of what a change does.',
      'None of this replaces engineering judgment. The teams that benefit most treat generated code like any other contribution: they review it, test it and keep ownership of the result.',
    ],
    vi: [
      'AI copilot hiện nằm ngay trong trình soạn thảo và gợi ý code khi lập trình viên gõ. Khi dùng đúng cách, chúng loại bỏ những việc lặp lại như code khung, ánh xạ dữ liệu và viết tài liệu, để dành nhiều thời gian hơn cho các quyết định thiết kế.',
      'Sinh code tự động và kiểm thử tự động đang thay đổi quy trình làm việc hàng ngày của đội phát triển. Bài kiểm thử có thể được soạn nháp từ code hiện có, và việc review có thể bắt đầu từ bản tóm tắt do máy viết về nội dung thay đổi.',
      'Không điều nào trong số này thay thế phán đoán của kỹ sư. Những đội hưởng lợi nhiều nhất coi code do AI sinh ra như mọi đóng góp khác: review, kiểm thử và chịu trách nhiệm về kết quả.',
    ],
  },
  b3: {
    en: [
      'Clean code starts with names. A variable or function whose name says what it does removes the need for most comments and makes a change easier to review.',
      'Small functions with a single purpose are easier to test and to reuse. When a function needs a long explanation, it is usually doing more than one job.',
      'Finally, keep dependencies pointing in one direction. Clear boundaries between modules are what keep a codebase easy to change a year from now.',
    ],
    vi: [
      'Clean code bắt đầu từ cách đặt tên. Một biến hoặc hàm có tên nói lên chức năng của nó giúp giảm phần lớn chú thích và làm cho việc review thay đổi dễ hơn.',
      'Những hàm nhỏ với một mục đích duy nhất dễ kiểm thử và tái sử dụng hơn. Khi một hàm cần giải thích dài dòng, thường là nó đang làm nhiều hơn một việc.',
      'Cuối cùng, hãy giữ các phụ thuộc theo một chiều. Ranh giới rõ ràng giữa các module là điều giúp codebase vẫn dễ thay đổi ngay cả một năm sau.',
    ],
  },
  b4: {
    en: [
      'A system that scales is designed for the traffic it will have next year, not only today. Stateless services, caching and queues let each part of the system grow on its own.',
      'Infrastructure should follow demand. Autoscaling and managed services let capacity rise during a spike and fall again afterwards, so cost follows usage instead of peak load.',
      'Observability closes the loop: with metrics and alerts in place, a team sees bottlenecks early and fixes them before customers notice.',
    ],
    vi: [
      'Một hệ thống có khả năng mở rộng được thiết kế cho lượng truy cập của năm sau, không chỉ của hôm nay. Dịch vụ không lưu trạng thái, bộ nhớ đệm và hàng đợi cho phép từng phần của hệ thống tăng trưởng độc lập.',
      'Hạ tầng nên đi theo nhu cầu. Tự động mở rộng và dịch vụ được quản lý cho phép năng lực tăng lên khi lưu lượng tăng vọt và giảm xuống sau đó, để chi phí bám theo mức sử dụng thay vì đỉnh tải.',
      'Khả năng quan sát khép kín vòng này: khi đã có số liệu và cảnh báo, đội ngũ nhìn thấy điểm nghẽn sớm và xử lý trước khi khách hàng kịp nhận ra.',
    ],
  },
};

// pages: SEO texts of the pages mockSeo.ts has no English for (the Vietnamese ones come from mockSeo.ts)
export const PAGE_SEO_ENGLISH: Readonly<
  Record<string, { title: string; description: string; keywords: string }>
> = {
  'trang-chu': {
    title: 'KhaiFrost Technology LLC | AI & Cloud Solutions',
    description:
      'KhaiFrost Technology delivers AI, Cloud and security solutions for modern businesses in Houston and Vietnam.',
    keywords: 'AI, Cloud, Software, DevOps, KhaiFrost',
  },
  'dich-vu': {
    title: 'Services | KhaiFrost Technology LLC',
    description:
      'Explore the AI, Cloud, DevOps and software development services of KhaiFrost Technology.',
    keywords: 'AI services, AWS, DevOps, software',
  },
  've-chung-toi': {
    title: 'About Us | KhaiFrost Technology LLC',
    description: 'Learn about the team and the mission of KhaiFrost Technology.',
    keywords: 'KhaiFrost, team, mission, technology',
  },
  'lien-he': {
    title: 'Contact | KhaiFrost Technology LLC',
    description:
      'Contact KhaiFrost Technology to get advice on the right technology solution for your business.',
    keywords: 'contact, consulting, KhaiFrost',
  },
};

// mockSeo.ts has no entry for the projects page
export const PROJECTS_PAGE_SEO = {
  vi: {
    title: 'Dự án | KhaiFrost Technology LLC',
    description:
      'Khám phá các dự án AI, Cloud, bảo mật và phần mềm tiêu biểu mà KhaiFrost Technology đã triển khai cho khách hàng.',
    keywords: 'dự án, AI, Cloud, phần mềm, KhaiFrost',
  },
  en: {
    title: 'Projects | KhaiFrost Technology LLC',
    description:
      'Explore the AI, Cloud, security and software projects KhaiFrost Technology has delivered for its clients.',
    keywords: 'projects, AI, Cloud, software, KhaiFrost',
  },
};

// Icons and copy for the three cards of the contact page availability block (texts come from the i18n bundles)
export const CONTACT_AVAILABILITY_CARDS: readonly {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}[] = [
  {
    id: 'response',
    icon: 'clock',
    titleKey: 'contactPage.availability.responseTitle',
    descriptionKey: 'contactPage.availability.responseDesc',
  },
  {
    id: 'hours',
    icon: 'calendar',
    titleKey: 'contactPage.availability.hoursTitle',
    descriptionKey: 'contactPage.availability.hoursDesc',
  },
  {
    id: 'support',
    icon: 'headset',
    titleKey: 'contactPage.availability.supportTitle',
    descriptionKey: 'contactPage.availability.supportDesc',
  },
];

// OurReach.tsx hard-codes these three figures
export const CONTACT_REACH_STATS: readonly { id: string; value: string; labelKey: string }[] = [
  { id: 'clients', value: '50+', labelKey: 'contactPage.reach.statClients' },
  { id: 'countries', value: '10+', labelKey: 'contactPage.reach.statCountries' },
  { id: 'satisfaction', value: '5★', labelKey: 'contactPage.reach.statSatisfaction' },
];

export const CONTACT_FAQ_KEYS: readonly { id: string; questionKey: string; answerKey: string }[] = [
  { id: 'faq-1', questionKey: 'contactPage.faq.q1', answerKey: 'contactPage.faq.a1' },
  { id: 'faq-2', questionKey: 'contactPage.faq.q2', answerKey: 'contactPage.faq.a2' },
  { id: 'faq-3', questionKey: 'contactPage.faq.q3', answerKey: 'contactPage.faq.a3' },
  { id: 'faq-4', questionKey: 'contactPage.faq.q4', answerKey: 'contactPage.faq.a4' },
];

export const MEDIA_FOLDER_LABELS_VI: Readonly<Record<string, string>> = {
  about: 'Giới thiệu',
  admin: 'Quản trị',
  contact: 'Liên hệ',
  hero: 'Banner chính',
  map: 'Bản đồ',
  covers: 'Ảnh bìa',
  placeholders: 'Ảnh minh hoạ',
  'projects-page': 'Trang dự án',
  'service-categories': 'Danh mục dịch vụ',
  services: 'Dịch vụ',
  'services-overview': 'Tổng quan dịch vụ',
  'ai-automation': 'AI & Tự động hoá',
  'aws-cloud-devops': 'AWS Cloud & DevOps',
  cybersecurity: 'An ninh mạng',
  'software-api-development': 'Phát triển phần mềm & API',
};

export const MEDIA_WORDS_VI: Readonly<Record<string, string>> = {
  banner: 'Banner',
  hero: 'Banner chính',
  mission: 'Sứ mệnh',
  vision: 'Tầm nhìn',
  office: 'Văn phòng',
  team: 'Đội ngũ',
  product: 'Sản phẩm',
  case: 'Dự án',
  blog: 'Bài viết',
  project: 'Dự án',
  testimonial: 'Khách hàng',
  partnership: 'Đối tác',
  login: 'Đăng nhập',
  global: 'Toàn cầu',
  reach: 'Phạm vi',
  earth: 'Trái đất',
  blue: 'xanh',
  marble: 'marble',
  factory: 'Nhà máy',
  healthcare: 'Y tế',
  warehouse: 'Kho hàng',
  chatbot: 'Chatbot',
  receptionist: 'Lễ tân',
  cloud: 'Cloud',
  migration: 'Di chuyển',
  custom: 'Tuỳ chỉnh',
  security: 'An ninh mạng',
  operations: 'Vận hành',
  center: 'Trung tâm',
  infrastructure: 'Hạ tầng',
  code: 'mã',
  cybersecurity: 'An ninh mạng',
  software: 'Phần mềm',
  automation: 'Tự động hoá',
  demo: 'Demo',
  houston: 'Houston',
  hcmc: 'TP. Hồ Chí Minh',
  aws: 'AWS',
};
