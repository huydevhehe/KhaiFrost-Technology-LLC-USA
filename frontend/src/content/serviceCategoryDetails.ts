import { ServiceCategoryDetail } from "@/types";

// TODO: khi có Admin Backend, thay hàm này bằng API call, giữ nguyên shape
// ServiceCategoryDetail để UI không cần đổi.
export const serviceCategoryDetails: ServiceCategoryDetail[] = [
  {
    slug: "ai-automation",
    categoryName: { en: "AI & Automation", vi: "AI & Automation" },
    heroTitle: {
      en: "Automate Your Business With AI",
      vi: "Tự động hoá doanh nghiệp bằng AI",
    },
    heroSubtitle: {
      en: "Apply artificial intelligence and automation to optimize processes, cut costs, boost productivity, and deliver an outstanding customer experience.",
      vi: "Ứng dụng trí tuệ nhân tạo và tự động hoá để tối ưu quy trình, giảm chi phí, tăng năng suất và tạo ra trải nghiệm khách hàng vượt trội.",
    },
    heroImage: "/images/services/ai-automation.jpg",
    stats: [
      {
        icon: "rocket",
        value: "50+",
        label: { en: "AI Projects Delivered", vi: "Dự án AI đã triển khai" },
        description: {
          en: "From startups to large enterprises",
          vi: "Từ startup đến doanh nghiệp lớn",
        },
      },
      {
        icon: "trendingUp",
        value: "+60%",
        label: { en: "Avg. Productivity Gain", vi: "Tăng năng suất trung bình" },
        description: {
          en: "After applying our AI solutions",
          vi: "Sau khi áp dụng giải pháp AI",
        },
      },
      {
        icon: "clock",
        value: "1,200+",
        label: { en: "Hours Saved / Month", vi: "Giờ tiết kiệm/tháng" },
        description: {
          en: "For our clients' businesses",
          vi: "Cho khách hàng của chúng tôi",
        },
      },
      {
        icon: "users",
        value: "100+",
        label: { en: "Active Clients", vi: "Khách hàng đang dùng" },
        description: {
          en: "In Vietnam and the USA",
          vi: "Tại Việt Nam và Mỹ",
        },
      },
    ],
    productsEyebrow: { en: "Our Services", vi: "Dịch vụ của chúng tôi" },
    productsHeading: {
      en: "AI & Automation Solutions",
      vi: "Các giải pháp AI & Automation",
    },
    productsIntro: {
      en: "From virtual assistants to full process automation, we provide comprehensive AI solutions that flex to your business needs.",
      vi: "Từ trợ lý ảo đến tự động hoá quy trình, chúng tôi cung cấp các giải pháp AI toàn diện, linh hoạt theo nhu cầu doanh nghiệp.",
    },
    products: [
      {
        id: "p1",
        name: { en: "AI Receptionist", vi: "AI Receptionist" },
        description: {
          en: "AI answers calls/texts, books appointments automatically for Salons, Dental clinics, SMEs.",
          vi: "AI lễ tân trả lời điện thoại/tin nhắn, đặt lịch tự động cho Salon, Nha khoa, SME.",
        },
        image: "/images/service-categories/ai-automation/product-1.jpg",
        duration: "02:15",
        tags: ["NLP", "Voice AI", "CRM"],
        href: "/dich-vu/ai-automation#ai-receptionist",
      },
      {
        id: "p2",
        name: { en: "AI Employee", vi: "AI Employee" },
        description: {
          en: "AI staff automates back-office workflows (order processing, reminders, reporting).",
          vi: "AI nhân viên ảo tự động hoá quy trình nội bộ (xử lý đơn hàng, nhắc việc, báo cáo).",
        },
        image: "/images/service-categories/ai-automation/product-2.jpg",
        duration: "01:48",
        tags: ["LLM", "Automation", "API"],
        href: "/dich-vu/ai-automation#ai-employee",
      },
      {
        id: "p3",
        name: { en: "AI Code Assistant", vi: "AI Code Assistant" },
        description: {
          en: "AI programming assistant that suggests code contextually, with real-time support.",
          vi: "Trợ lý lập trình AI gợi ý code theo ngữ cảnh, hỗ trợ real-time.",
        },
        image: "/images/service-categories/ai-automation/product-3.jpg",
        duration: "02:32",
        tags: ["GPT", "VS Code", "API"],
        href: "/dich-vu/ai-automation#ai-code-assistant",
      },
      {
        id: "p4",
        name: { en: "Workflow Automation", vi: "Workflow Automation" },
        description: {
          en: "Automate business workflows, integrate with existing systems (CRM, email, warehousing).",
          vi: "Tự động hoá quy trình nghiệp vụ, tích hợp đa hệ thống (CRM, email, kho hàng).",
        },
        image: "/images/service-categories/ai-automation/product-4.jpg",
        duration: "02:10",
        tags: ["Zapier", "n8n", "API"],
        href: "/dich-vu/ai-automation#workflow-automation",
      },
      {
        id: "p5",
        name: { en: "AI Customer Support Chatbot", vi: "AI Chatbot hỗ trợ khách hàng" },
        description: {
          en: "Multi-channel chatbot (web, Zalo, Messenger) that answers customers 24/7.",
          vi: "Chatbot đa kênh (web, Zalo, Messenger) trả lời khách hàng 24/7.",
        },
        image: "/images/service-categories/ai-automation/product-5.jpg",
        duration: "01:55",
        tags: ["NLP", "Multi-channel", "CRM"],
        href: "/dich-vu/ai-automation#ai-chatbot",
      },
      {
        id: "p6",
        name: { en: "AI Document Processing", vi: "AI Document Processing" },
        description: {
          en: "Automatically extract data from invoices, contracts and forms.",
          vi: "Trích xuất dữ liệu tự động từ hoá đơn, hợp đồng, biểu mẫu.",
        },
        image: "/images/service-categories/ai-automation/product-6.jpg",
        duration: "02:20",
        tags: ["OCR", "LLM", "Automation"],
        href: "/dich-vu/ai-automation#ai-document-processing",
      },
    ],
    process: [
      {
        step: "01",
        icon: "search",
        title: { en: "Needs Assessment", vi: "Khảo sát nhu cầu" },
        description: {
          en: "Understand your goals, processes and challenges to shape the right approach.",
          vi: "Tìm hiểu mục tiêu, quy trình và thách thức của doanh nghiệp.",
        },
      },
      {
        step: "02",
        icon: "lightbulb",
        title: { en: "Solution Design", vi: "Thiết kế giải pháp AI" },
        description: {
          en: "Propose the right architecture, technology and roadmap.",
          vi: "Đề xuất kiến trúc, công nghệ và lộ trình phù hợp.",
        },
      },
      {
        step: "03",
        icon: "settings",
        title: { en: "Build & Integrate", vi: "Triển khai & tích hợp" },
        description: {
          en: "Develop, integrate with your existing systems and run QA.",
          vi: "Phát triển, tích hợp hệ thống và kiểm thử vận hành.",
        },
      },
      {
        step: "04",
        icon: "lineChart",
        title: { en: "Operate & Optimize", vi: "Vận hành & tối ưu liên tục" },
        description: {
          en: "Monitor, support and continuously improve for the best results.",
          vi: "Giám sát, hỗ trợ và cải tiến để đạt hiệu quả tốt nhất.",
        },
      },
    ],
    whyUs: [
      {
        icon: "briefcase",
        title: { en: "Deep Industry Knowledge", vi: "Am hiểu ngành cụ thể" },
        description: {
          en: "Proven experience deploying for Salons, Dental clinics, SMEs and more.",
          vi: "Kinh nghiệm triển khai cho Salon, Dental, SME và nhiều lĩnh vực khác.",
        },
      },
      {
        icon: "bolt",
        title: { en: "Fast, Seamless Integration", vi: "Tích hợp nhanh, không gián đoạn" },
        description: {
          en: "Flexible deployment that optimizes your current workflows.",
          vi: "Triển khai linh hoạt, tối ưu quy trình hiện tại của bạn.",
        },
      },
      {
        icon: "shield",
        title: { en: "Enterprise-Grade Data Security", vi: "Bảo mật dữ liệu doanh nghiệp" },
        description: {
          en: "Complies with international security standards, encrypted and access-controlled.",
          vi: "Tuân thủ tiêu chuẩn bảo mật quốc tế, mã hoá và kiểm soát truy cập chặt chẽ.",
        },
      },
      {
        icon: "headset",
        title: { en: "24/7 Support After Launch", vi: "Hỗ trợ 24/7 sau triển khai" },
        description: {
          en: "Our technical team is always ready to support you.",
          vi: "Đội ngũ kỹ thuật luôn sẵn sàng đồng hành cùng bạn.",
        },
      },
    ],
    caseStudies: [
      {
        id: "c1",
        name: {
          en: "AI Receptionist for SmilePlus Dental Clinic",
          vi: "AI Receptionist cho Nha khoa SmilePlus",
        },
        description: {
          en: "Automated missed calls, appointment booking and reminders.",
          vi: "Tự động bắt máy, đặt lịch hẹn, nhắc lịch cho khách hàng.",
        },
        image: "/images/service-categories/ai-automation/case-1.jpg",
        duration: "02:12",
        tags: ["Voice AI", "CRM", "Automation"],
      },
      {
        id: "c2",
        name: {
          en: "AI Employee for Beauty Salon Group",
          vi: "AI Employee cho chuỗi Salon Beauty Group",
        },
        description: {
          en: "Automated order processing, reporting and reminders across the chain.",
          vi: "Tự động xử lý đơn hàng, báo cáo, nhắc việc cho toàn chuỗi.",
        },
        image: "/images/service-categories/ai-automation/case-2.jpg",
        duration: "02:48",
        tags: ["LLM", "Automation", "API"],
      },
      {
        id: "c3",
        name: {
          en: "AI Chatbot for EcomPlus E-commerce",
          vi: "AI Chatbot cho thương mại điện tử EcomPlus",
        },
        description: {
          en: "Support customers 24/7, boosting the conversion rate.",
          vi: "Hỗ trợ khách hàng 24/7, tăng tỉ lệ chuyển đổi.",
        },
        image: "/images/service-categories/ai-automation/case-3.jpg",
        duration: "02:04",
        tags: ["NLP", "Chatbot", "Multi-channel"],
      },
    ],
    testimonials: [
      {
        id: "t1",
        quote: {
          en: "The AI Receptionist helped us reduce missed calls by 80% and increase booked appointments by 40%. Our team can finally focus on more important work!",
          vi: "AI Receptionist giúp chúng tôi giảm 80% cuộc gọi nhỡ và tăng 40% lịch hẹn thành công! Đội ngũ KhaiFrost rất chuyên nghiệp!",
        },
        name: "Nguyễn Thị Mai",
        role: "Owner, SmilePlus Dental Clinic",
        avatar: "/images/placeholders/testimonial-1.jpg",
      },
      {
        id: "t2",
        quote: {
          en: "The AI Employee handles our internal processes much faster now. The team can focus on the work that really matters.",
          vi: "AI Employee giúp quy trình nội bộ của chúng tôi nhanh hơn rất nhiều. Nhân viên tập trung vào công việc quan trọng hơn.",
        },
        name: "Trần Minh Tuấn",
        role: "CEO, Beauty Salon Group",
        avatar: "/images/placeholders/testimonial-4.jpg",
      },
      {
        id: "t3",
        quote: {
          en: "KhaiFrost's chatbot runs reliably and responds accurately, supporting customers 24/7. We're extremely satisfied.",
          vi: "Chatbot của KhaiFrost hoạt động ổn định, trả lời chính xác và hỗ trợ khách hàng 24/7. Chúng tôi rất hài lòng!",
        },
        name: "Lê Hoàng Anh",
        role: "Founder, EcomPlus",
        avatar: "/images/placeholders/testimonial-3.jpg",
      },
    ],
    partnerBanner: {
      label: { en: "KhaiFrost Partnership", vi: "Hợp tác KhaiFrost" },
      heading: { en: "Become a Partner / Affiliate", vi: "Trở thành Đối tác / CTV" },
      text: {
        en: "AI Receptionist & AI Employee are distributed through our Partner/Affiliate network, with recurring commission based on monthly subscription revenue.",
        vi: "AI Receptionist & AI Employee sẵn sàng phân phối qua mạng lưới Đối tác/CTV với hoa hồng recurring theo doanh thu subscription hàng tháng.",
      },
      ctaLabel: { en: "Learn about the Affiliate program →", vi: "Tìm hiểu chương trình CTV →" },
      ctaHref: "/lien-he",
      image: "/images/service-categories/ai-automation/partnership.jpg",
    },
    faq: [
      {
        question: {
          en: "How long does it take to deploy an AI solution?",
          vi: "Thời gian triển khai dự án AI là bao lâu?",
        },
        answer: {
          en: "Depending on the scope, most solutions like AI Receptionist or Chatbot take 1–3 weeks to deploy. More complex workflow automation projects may take 4–8 weeks.",
          vi: "Tuỳ theo phạm vi dự án, hầu hết các giải pháp như AI Receptionist hay Chatbot mất khoảng 1–3 tuần để triển khai. Các dự án workflow automation phức tạp hơn có thể mất 4–8 tuần.",
        },
      },
      {
        question: {
          en: "Do I need my own technical team?",
          vi: "Có cần đội ngũ kỹ thuật riêng không?",
        },
        answer: {
          en: "No. Our team handles setup, integration and 24/7 support after launch, so you don't need an in-house technical team.",
          vi: "Không cần. Đội ngũ KhaiFrost sẽ phụ trách toàn bộ việc thiết lập, tích hợp và hỗ trợ 24/7 sau khi triển khai.",
        },
      },
      {
        question: {
          en: "Is pricing a one-time fee or a monthly subscription?",
          vi: "Chi phí được tính theo tháng hay 1 lần?",
        },
        answer: {
          en: "We offer both models: a one-time setup fee plus a monthly subscription, or a custom package depending on your scale and needs.",
          vi: "Chúng tôi có cả hai hình thức: phí thiết lập một lần cộng phí subscription hàng tháng, hoặc gói tuỳ chỉnh theo quy mô và nhu cầu của bạn.",
        },
      },
      {
        question: {
          en: "Is my business data kept secure?",
          vi: "Dữ liệu của tôi có được bảo mật không?",
        },
        answer: {
          en: "Yes. All data is encrypted, access-controlled and complies with international security standards.",
          vi: "Có. Toàn bộ dữ liệu được mã hoá, kiểm soát truy cập chặt chẽ và tuân thủ các tiêu chuẩn bảo mật quốc tế.",
        },
      },
      {
        question: {
          en: "Can the solution be customized for my industry?",
          vi: "Có hỗ trợ tuỳ biến theo ngành không?",
        },
        answer: {
          en: "Absolutely. We tailor the AI solution's workflow, tone and integrations to fit your specific industry, whether it's Dental, Salon, e-commerce or another SME sector.",
          vi: "Hoàn toàn có. Chúng tôi tuỳ biến quy trình, giọng điệu và tích hợp của giải pháp AI theo đúng đặc thù ngành của bạn, dù là Nha khoa, Salon, thương mại điện tử hay các lĩnh vực SME khác.",
        },
      },
    ],
  },
  {
    slug: "aws-cloud-devops",
    categoryName: { en: "AWS Cloud & DevOps", vi: "AWS Cloud & DevOps" },
    heroTitle: {
      en: "Scale With Confidence on AWS",
      vi: "Mở rộng quy mô vững vàng trên AWS",
    },
    heroSubtitle: {
      en: "Build scalable cloud architecture, automate deployment with CI/CD, and optimize AWS costs so your systems grow with your business.",
      vi: "Xây dựng kiến trúc cloud có khả năng mở rộng, tự động hoá triển khai với CI/CD và tối ưu chi phí AWS để hệ thống luôn theo kịp tốc độ phát triển của doanh nghiệp.",
    },
    heroImage: "/images/services/aws-cloud.jpg",
    stats: [
      {
        icon: "rocket",
        value: "80+",
        label: { en: "Cloud Projects Delivered", vi: "Dự án Cloud đã triển khai" },
        description: {
          en: "Migrations, CI/CD and infrastructure builds",
          vi: "Migration, CI/CD và dựng hạ tầng mới",
        },
      },
      {
        icon: "trendingUp",
        value: "-35%",
        label: { en: "Avg. AWS Cost Reduction", vi: "Tiết kiệm chi phí AWS trung bình" },
        description: {
          en: "After our cost optimization review",
          vi: "Sau khi được tối ưu chi phí",
        },
      },
      {
        icon: "clock",
        value: "99.9%",
        label: { en: "Uptime SLA", vi: "Cam kết Uptime" },
        description: {
          en: "For managed production workloads",
          vi: "Cho các hệ thống production được quản lý",
        },
      },
      {
        icon: "users",
        value: "60+",
        label: { en: "Active Clients", vi: "Khách hàng đang dùng" },
        description: {
          en: "In Vietnam and the USA",
          vi: "Tại Việt Nam và Mỹ",
        },
      },
    ],
    productsEyebrow: { en: "Our Services", vi: "Dịch vụ của chúng tôi" },
    productsHeading: {
      en: "AWS Cloud & DevOps Solutions",
      vi: "Các giải pháp AWS Cloud & DevOps",
    },
    productsIntro: {
      en: "From migration to automated deployment pipelines, we help you build cloud infrastructure that is reliable, scalable and cost-efficient.",
      vi: "Từ migration đến pipeline triển khai tự động, chúng tôi giúp bạn xây dựng hạ tầng cloud ổn định, dễ mở rộng và tối ưu chi phí.",
    },
    products: [
      {
        id: "p1",
        name: { en: "Cloud Migration", vi: "Cloud Migration" },
        description: {
          en: "Migrate your on-premise or legacy systems to AWS with minimal downtime.",
          vi: "Di chuyển hệ thống on-premise hoặc legacy lên AWS với thời gian gián đoạn tối thiểu.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-1.jpg",
        duration: "02:20",
        tags: ["AWS", "Migration", "EC2"],
        href: "/dich-vu/aws-cloud-devops#cloud-migration",
      },
      {
        id: "p2",
        name: { en: "CI/CD Pipeline Setup", vi: "Thiết lập CI/CD Pipeline" },
        description: {
          en: "Automate build, test and deployment so releases ship faster and safer.",
          vi: "Tự động hoá build, test và deploy để release nhanh hơn và an toàn hơn.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-2.jpg",
        duration: "02:05",
        tags: ["CI/CD", "GitHub Actions", "CodePipeline"],
        href: "/dich-vu/aws-cloud-devops#cicd-pipeline",
      },
      {
        id: "p3",
        name: { en: "Infrastructure as Code (Terraform)", vi: "Infrastructure as Code (Terraform)" },
        description: {
          en: "Define and version your infrastructure so environments stay consistent and reproducible.",
          vi: "Định nghĩa và quản lý phiên bản hạ tầng để môi trường luôn nhất quán, dễ tái tạo.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-3.jpg",
        duration: "01:58",
        tags: ["Terraform", "IaC", "AWS"],
        href: "/dich-vu/aws-cloud-devops#infrastructure-as-code",
      },
      {
        id: "p4",
        name: { en: "Auto Scaling & Load Balancing", vi: "Auto Scaling & Load Balancing" },
        description: {
          en: "Automatically scale resources to handle traffic spikes without over-provisioning.",
          vi: "Tự động mở rộng tài nguyên để xử lý lưu lượng tăng đột biến mà không lãng phí chi phí.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-4.jpg",
        duration: "02:12",
        tags: ["Auto Scaling", "ELB", "AWS"],
        href: "/dich-vu/aws-cloud-devops#auto-scaling",
      },
      {
        id: "p5",
        name: { en: "Cloud Cost Optimization", vi: "Tối ưu chi phí Cloud" },
        description: {
          en: "Audit and right-size your AWS resources to cut wasted spend without losing performance.",
          vi: "Rà soát và tối ưu tài nguyên AWS để cắt giảm chi phí lãng phí mà vẫn đảm bảo hiệu năng.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-5.jpg",
        duration: "01:45",
        tags: ["Cost Optimization", "AWS", "FinOps"],
        href: "/dich-vu/aws-cloud-devops#cost-optimization",
      },
      {
        id: "p6",
        name: { en: "Disaster Recovery & Backup", vi: "Disaster Recovery & Backup" },
        description: {
          en: "Design backup and recovery strategies that protect your data and minimize downtime.",
          vi: "Thiết kế chiến lược backup và khôi phục để bảo vệ dữ liệu và giảm thiểu thời gian gián đoạn.",
        },
        image: "/images/service-categories/aws-cloud-devops/product-6.jpg",
        duration: "02:00",
        tags: ["Backup", "DR", "AWS"],
        href: "/dich-vu/aws-cloud-devops#disaster-recovery",
      },
    ],
    process: [
      {
        step: "01",
        icon: "search",
        title: { en: "Infrastructure Assessment", vi: "Khảo sát hạ tầng" },
        description: {
          en: "Review your current systems, workloads and growth plans.",
          vi: "Đánh giá hệ thống hiện tại, khối lượng công việc và kế hoạch mở rộng.",
        },
      },
      {
        step: "02",
        icon: "lightbulb",
        title: { en: "Architecture Design", vi: "Thiết kế kiến trúc" },
        description: {
          en: "Propose the right AWS architecture, security model and CI/CD strategy.",
          vi: "Đề xuất kiến trúc AWS, mô hình bảo mật và chiến lược CI/CD phù hợp.",
        },
      },
      {
        step: "03",
        icon: "settings",
        title: { en: "Migrate & Automate", vi: "Migration & tự động hoá" },
        description: {
          en: "Execute migration, set up pipelines and infrastructure as code.",
          vi: "Thực hiện migration, thiết lập pipeline và infrastructure as code.",
        },
      },
      {
        step: "04",
        icon: "lineChart",
        title: { en: "Monitor & Optimize", vi: "Giám sát & tối ưu liên tục" },
        description: {
          en: "Monitor performance and costs, and continuously fine-tune your infrastructure.",
          vi: "Giám sát hiệu năng, chi phí và liên tục tinh chỉnh hạ tầng.",
        },
      },
    ],
    whyUs: [
      {
        icon: "briefcase",
        title: { en: "Certified AWS Expertise", vi: "Chuyên môn AWS được chứng nhận" },
        description: {
          en: "Our engineers hold AWS certifications and have delivered migrations across many industries.",
          vi: "Đội ngũ kỹ sư có chứng chỉ AWS và kinh nghiệm migration trên nhiều lĩnh vực.",
        },
      },
      {
        icon: "bolt",
        title: { en: "Zero/Minimal Downtime Migration", vi: "Migration gần như không gián đoạn" },
        description: {
          en: "We plan cutovers carefully so your business keeps running smoothly.",
          vi: "Lên kế hoạch chuyển đổi kỹ lưỡng để doanh nghiệp vận hành liên tục.",
        },
      },
      {
        icon: "shield",
        title: { en: "Security & Compliance Built-In", vi: "Bảo mật & tuân thủ ngay từ đầu" },
        description: {
          en: "Every architecture follows AWS Well-Architected security best practices.",
          vi: "Mọi kiến trúc đều tuân theo các nguyên tắc bảo mật của AWS Well-Architected.",
        },
      },
      {
        icon: "headset",
        title: { en: "24/7 Monitoring & Support", vi: "Giám sát & hỗ trợ 24/7" },
        description: {
          en: "Our team monitors your systems around the clock and responds quickly to incidents.",
          vi: "Đội ngũ kỹ thuật giám sát hệ thống liên tục và xử lý sự cố nhanh chóng.",
        },
      },
    ],
    caseStudies: [
      {
        id: "c1",
        name: {
          en: "Cloud Migration for ShopWave E-commerce",
          vi: "Cloud Migration cho ShopWave E-commerce",
        },
        description: {
          en: "Migrated a high-traffic warehouse and order system to AWS with zero downtime.",
          vi: "Di chuyển hệ thống kho vận và đơn hàng lưu lượng cao lên AWS không gián đoạn.",
        },
        image: "/images/service-categories/aws-cloud-devops/case-1.jpg",
        duration: "02:30",
        tags: ["Migration", "AWS", "E-commerce"],
      },
      {
        id: "c2",
        name: {
          en: "CI/CD Pipeline for FinPay Fintech Startup",
          vi: "CI/CD Pipeline cho startup Fintech FinPay",
        },
        description: {
          en: "Built an automated pipeline that cut release time from days to hours.",
          vi: "Xây dựng pipeline tự động giúp giảm thời gian release từ nhiều ngày xuống còn vài giờ.",
        },
        image: "/images/service-categories/aws-cloud-devops/case-2.jpg",
        duration: "02:15",
        tags: ["CI/CD", "Fintech", "AWS"],
      },
      {
        id: "c3",
        name: {
          en: "Infrastructure as Code for CloudSuite SaaS",
          vi: "Infrastructure as Code cho SaaS CloudSuite",
        },
        description: {
          en: "Standardized multi-environment infrastructure with Terraform, cutting setup time significantly.",
          vi: "Chuẩn hoá hạ tầng đa môi trường bằng Terraform, rút ngắn đáng kể thời gian thiết lập.",
        },
        image: "/images/service-categories/aws-cloud-devops/case-3.jpg",
        duration: "02:00",
        tags: ["Terraform", "IaC", "SaaS"],
      },
    ],
    testimonials: [
      {
        id: "t1",
        quote: {
          en: "KhaiFrost migrated our entire order system to AWS without a single hour of downtime. Our infrastructure has never been more reliable.",
          vi: "KhaiFrost đã di chuyển toàn bộ hệ thống đơn hàng của chúng tôi lên AWS mà không hề gián đoạn một phút nào. Hạ tầng chưa bao giờ ổn định như vậy!",
        },
        name: "Phạm Thanh Hà",
        role: "CTO, ShopWave E-commerce",
        avatar: "/images/placeholders/testimonial-2.jpg",
      },
      {
        id: "t2",
        quote: {
          en: "Our release cycle went from days to just a few hours after KhaiFrost set up our CI/CD pipeline. Truly a game changer.",
          vi: "Chu kỳ release của chúng tôi từ nhiều ngày rút xuống chỉ còn vài giờ sau khi KhaiFrost thiết lập CI/CD. Thực sự là một bước ngoặt!",
        },
        name: "Đỗ Văn Khoa",
        role: "Engineering Lead, FinPay",
        avatar: "/images/placeholders/testimonial-5.jpg",
      },
      {
        id: "t3",
        quote: {
          en: "The cost optimization review saved us over a third of our AWS bill, without any impact on performance.",
          vi: "Đợt rà soát tối ưu chi phí giúp chúng tôi tiết kiệm hơn một phần ba hoá đơn AWS mà hiệu năng vẫn không đổi.",
        },
        name: "Trịnh Bảo Ngọc",
        role: "Founder, CloudSuite",
        avatar: "/images/placeholders/testimonial-6.jpg",
      },
    ],
    faq: [
      {
        question: {
          en: "How long does a cloud migration take?",
          vi: "Migration lên cloud mất bao lâu?",
        },
        answer: {
          en: "Depending on system complexity, most migrations take 2–6 weeks. We always plan a detailed cutover strategy to minimize downtime.",
          vi: "Tuỳ độ phức tạp của hệ thống, hầu hết các dự án migration mất khoảng 2–6 tuần. Chúng tôi luôn lên kế hoạch chuyển đổi chi tiết để giảm thiểu gián đoạn.",
        },
      },
      {
        question: {
          en: "Will my systems experience downtime during migration?",
          vi: "Hệ thống có bị gián đoạn trong quá trình migration không?",
        },
        answer: {
          en: "We design migration plans to minimize or eliminate downtime, using techniques like blue-green deployment and phased cutovers.",
          vi: "Chúng tôi thiết kế kế hoạch migration để giảm thiểu hoặc loại bỏ gián đoạn, sử dụng các kỹ thuật như blue-green deployment và chuyển đổi theo giai đoạn.",
        },
      },
      {
        question: {
          en: "Can you help reduce our current AWS costs?",
          vi: "Có thể giúp giảm chi phí AWS hiện tại không?",
        },
        answer: {
          en: "Yes. Our Cloud Cost Optimization service audits your resources and typically reduces AWS spend by 20–40%.",
          vi: "Có. Dịch vụ tối ưu chi phí Cloud sẽ rà soát tài nguyên và thường giúp giảm 20–40% chi phí AWS.",
        },
      },
      {
        question: {
          en: "Do you support multi-cloud or hybrid setups?",
          vi: "Có hỗ trợ mô hình multi-cloud hoặc hybrid không?",
        },
        answer: {
          en: "Yes, we design architectures that integrate AWS with your on-premise systems or other cloud providers as needed.",
          vi: "Có, chúng tôi thiết kế kiến trúc tích hợp AWS với hệ thống on-premise hoặc các nhà cung cấp cloud khác khi cần thiết.",
        },
      },
      {
        question: {
          en: "What happens if something breaks after go-live?",
          vi: "Nếu có sự cố sau khi go-live thì sao?",
        },
        answer: {
          en: "Our team provides 24/7 monitoring and rapid incident response to keep your systems running smoothly.",
          vi: "Đội ngũ của chúng tôi giám sát 24/7 và xử lý sự cố nhanh chóng để hệ thống luôn vận hành ổn định.",
        },
      },
    ],
  },
  {
    slug: "cybersecurity",
    categoryName: {
      en: "Managed Infrastructure & Cybersecurity",
      vi: "Quản lý hạ tầng & An ninh mạng",
    },
    heroTitle: {
      en: "Protect Your Business With Enterprise-Grade Security",
      vi: "Bảo vệ doanh nghiệp với bảo mật cấp doanh nghiệp",
    },
    heroSubtitle: {
      en: "24/7 monitoring, penetration testing and managed infrastructure that keep your systems secure and your business running without interruption.",
      vi: "Giám sát 24/7, kiểm thử xâm nhập và quản lý hạ tầng giúp hệ thống của bạn luôn an toàn và doanh nghiệp vận hành liên tục.",
    },
    heroImage: "/images/services/cybersecurity.jpg",
    stats: [
      {
        icon: "rocket",
        value: "70+",
        label: { en: "Security Projects Delivered", vi: "Dự án bảo mật đã triển khai" },
        description: {
          en: "Monitoring, pentest and infrastructure management",
          vi: "Giám sát, pentest và quản lý hạ tầng",
        },
      },
      {
        icon: "trendingUp",
        value: "-90%",
        label: { en: "Avg. Incident Response Time", vi: "Giảm thời gian ứng phó sự cố" },
        description: {
          en: "Compared to before our monitoring was in place",
          vi: "So với trước khi có hệ thống giám sát",
        },
      },
      {
        icon: "clock",
        value: "24/7",
        label: { en: "Security Monitoring", vi: "Giám sát bảo mật liên tục" },
        description: {
          en: "Round-the-clock coverage for your systems",
          vi: "Bao phủ liên tục cho hệ thống của bạn",
        },
      },
      {
        icon: "users",
        value: "50+",
        label: { en: "Active Clients", vi: "Khách hàng đang dùng" },
        description: {
          en: "In Vietnam and the USA",
          vi: "Tại Việt Nam và Mỹ",
        },
      },
    ],
    productsEyebrow: { en: "Our Services", vi: "Dịch vụ của chúng tôi" },
    productsHeading: {
      en: "Cybersecurity & Managed Infrastructure Solutions",
      vi: "Các giải pháp An ninh mạng & Quản lý hạ tầng",
    },
    productsIntro: {
      en: "From continuous monitoring to incident response, we provide comprehensive security services that protect your data and your reputation.",
      vi: "Từ giám sát liên tục đến ứng phó sự cố, chúng tôi cung cấp các dịch vụ bảo mật toàn diện để bảo vệ dữ liệu và uy tín của doanh nghiệp.",
    },
    products: [
      {
        id: "p1",
        name: { en: "24/7 Security Monitoring", vi: "Giám sát bảo mật 24/7" },
        description: {
          en: "Continuous monitoring of your systems to detect and respond to threats in real time.",
          vi: "Giám sát liên tục hệ thống để phát hiện và ứng phó với các mối đe doạ theo thời gian thực.",
        },
        image: "/images/service-categories/cybersecurity/product-1.jpg",
        duration: "02:05",
        tags: ["SOC", "SIEM", "24/7"],
        href: "/dich-vu/cybersecurity#security-monitoring",
      },
      {
        id: "p2",
        name: { en: "Penetration Testing", vi: "Kiểm thử xâm nhập (Pentest)" },
        description: {
          en: "Simulate real-world attacks to uncover vulnerabilities before hackers do.",
          vi: "Mô phỏng các cuộc tấn công thực tế để phát hiện lỗ hổng trước khi tin tặc khai thác.",
        },
        image: "/images/service-categories/cybersecurity/product-2.jpg",
        duration: "02:18",
        tags: ["Pentest", "OWASP", "Red Team"],
        href: "/dich-vu/cybersecurity#penetration-testing",
      },
      {
        id: "p3",
        name: { en: "Firewall & Network Security", vi: "Firewall & Bảo mật mạng" },
        description: {
          en: "Configure and manage firewalls and network defenses to block unauthorized access.",
          vi: "Cấu hình và quản lý firewall, hệ thống phòng thủ mạng để ngăn chặn truy cập trái phép.",
        },
        image: "/images/service-categories/cybersecurity/product-3.jpg",
        duration: "01:50",
        tags: ["Firewall", "Network", "VPN"],
        href: "/dich-vu/cybersecurity#firewall-network-security",
      },
      {
        id: "p4",
        name: { en: "Data Encryption & Compliance", vi: "Mã hoá dữ liệu & Tuân thủ" },
        description: {
          en: "Encrypt sensitive data and ensure compliance with security standards like ISO 27001, SOC 2.",
          vi: "Mã hoá dữ liệu nhạy cảm và đảm bảo tuân thủ các tiêu chuẩn bảo mật như ISO 27001, SOC 2.",
        },
        image: "/images/service-categories/cybersecurity/product-4.jpg",
        duration: "02:00",
        tags: ["Encryption", "Compliance", "ISO 27001"],
        href: "/dich-vu/cybersecurity#data-encryption-compliance",
      },
      {
        id: "p5",
        name: { en: "Incident Response", vi: "Ứng phó sự cố" },
        description: {
          en: "Rapidly detect, contain and recover from security incidents to minimize damage.",
          vi: "Phát hiện, ngăn chặn và khôi phục nhanh chóng sau sự cố bảo mật để giảm thiểu thiệt hại.",
        },
        image: "/images/service-categories/cybersecurity/product-5.jpg",
        duration: "02:10",
        tags: ["Incident Response", "Forensics", "SOC"],
        href: "/dich-vu/cybersecurity#incident-response",
      },
      {
        id: "p6",
        name: { en: "Managed IT Infrastructure", vi: "Quản lý hạ tầng IT" },
        description: {
          en: "End-to-end management of your servers, networks and systems so your team can focus on the business.",
          vi: "Quản lý toàn diện server, hệ thống mạng để đội ngũ của bạn tập trung vào kinh doanh.",
        },
        image: "/images/service-categories/cybersecurity/product-6.jpg",
        duration: "02:15",
        tags: ["Managed IT", "Infrastructure", "Support"],
        href: "/dich-vu/cybersecurity#managed-it-infrastructure",
      },
    ],
    process: [
      {
        step: "01",
        icon: "search",
        title: { en: "Security Assessment", vi: "Đánh giá bảo mật" },
        description: {
          en: "Review your systems, identify vulnerabilities and compliance gaps.",
          vi: "Rà soát hệ thống, xác định lỗ hổng và khoảng trống tuân thủ.",
        },
      },
      {
        step: "02",
        icon: "lightbulb",
        title: { en: "Security Strategy Design", vi: "Thiết kế chiến lược bảo mật" },
        description: {
          en: "Propose the right defenses, monitoring tools and response plan.",
          vi: "Đề xuất giải pháp phòng thủ, công cụ giám sát và kế hoạch ứng phó phù hợp.",
        },
      },
      {
        step: "03",
        icon: "settings",
        title: { en: "Implement & Harden", vi: "Triển khai & tăng cường bảo mật" },
        description: {
          en: "Deploy firewalls, encryption and monitoring systems across your infrastructure.",
          vi: "Triển khai firewall, mã hoá và hệ thống giám sát trên toàn bộ hạ tầng.",
        },
      },
      {
        step: "04",
        icon: "lineChart",
        title: { en: "Monitor & Respond", vi: "Giám sát & ứng phó liên tục" },
        description: {
          en: "Provide continuous monitoring and rapid incident response around the clock.",
          vi: "Giám sát liên tục và ứng phó sự cố nhanh chóng 24/7.",
        },
      },
    ],
    whyUs: [
      {
        icon: "briefcase",
        title: { en: "Certified Security Experts", vi: "Chuyên gia bảo mật được chứng nhận" },
        description: {
          en: "Our team holds industry security certifications and has protected businesses across many sectors.",
          vi: "Đội ngũ có chứng chỉ bảo mật ngành và kinh nghiệm bảo vệ doanh nghiệp trên nhiều lĩnh vực.",
        },
      },
      {
        icon: "bolt",
        title: { en: "Rapid Threat Detection", vi: "Phát hiện mối đe doạ nhanh chóng" },
        description: {
          en: "Real-time monitoring alerts our team the moment suspicious activity is detected.",
          vi: "Giám sát thời gian thực giúp đội ngũ cảnh báo ngay khi phát hiện hoạt động bất thường.",
        },
      },
      {
        icon: "shield",
        title: { en: "Compliance-Ready Solutions", vi: "Giải pháp sẵn sàng cho tuân thủ" },
        description: {
          en: "We help you meet ISO 27001, SOC 2 and other industry security standards.",
          vi: "Chúng tôi giúp bạn đáp ứng ISO 27001, SOC 2 và các tiêu chuẩn bảo mật ngành khác.",
        },
      },
      {
        icon: "headset",
        title: { en: "24/7 Incident Response Team", vi: "Đội ngũ ứng phó sự cố 24/7" },
        description: {
          en: "Our security team is always on standby to respond to threats immediately.",
          vi: "Đội ngũ bảo mật luôn túc trực để ứng phó với các mối đe doạ ngay lập tức.",
        },
      },
    ],
    caseStudies: [
      {
        id: "c1",
        name: {
          en: "24/7 Monitoring for TrustBank Financial Group",
          vi: "Giám sát 24/7 cho Tập đoàn Tài chính TrustBank",
        },
        description: {
          en: "Deployed continuous security monitoring, cutting incident response time by 90%.",
          vi: "Triển khai giám sát bảo mật liên tục, giảm 90% thời gian ứng phó sự cố.",
        },
        image: "/images/service-categories/cybersecurity/case-1.jpg",
        duration: "02:25",
        tags: ["SOC", "Finance", "Monitoring"],
      },
      {
        id: "c2",
        name: {
          en: "Data Encryption for MediCare Health System",
          vi: "Mã hoá dữ liệu cho Hệ thống Y tế MediCare",
        },
        description: {
          en: "Secured sensitive patient data and achieved full compliance with health data standards.",
          vi: "Bảo vệ dữ liệu bệnh nhân nhạy cảm và đạt chuẩn tuân thủ dữ liệu y tế.",
        },
        image: "/images/service-categories/cybersecurity/case-2.jpg",
        duration: "02:10",
        tags: ["Encryption", "Healthcare", "Compliance"],
      },
      {
        id: "c3",
        name: {
          en: "Managed Infrastructure for SwiftLine Logistics",
          vi: "Quản lý hạ tầng cho SwiftLine Logistics",
        },
        description: {
          en: "Took over infrastructure management, reducing downtime and strengthening network security.",
          vi: "Tiếp quản quản lý hạ tầng, giảm thời gian gián đoạn và tăng cường bảo mật mạng.",
        },
        image: "/images/service-categories/cybersecurity/case-3.jpg",
        duration: "02:05",
        tags: ["Managed IT", "Logistics", "Network Security"],
      },
    ],
    testimonials: [
      {
        id: "t1",
        quote: {
          en: "KhaiFrost's 24/7 monitoring caught a threat before it could impact our customers. Their response time is exceptional.",
          vi: "Hệ thống giám sát 24/7 của KhaiFrost đã phát hiện mối đe doạ trước khi ảnh hưởng đến khách hàng. Thời gian phản hồi thực sự ấn tượng!",
        },
        name: "Vũ Đức Thịnh",
        role: "IT Director, TrustBank Financial Group",
        avatar: "/images/placeholders/testimonial-1.jpg",
      },
      {
        id: "t2",
        quote: {
          en: "Thanks to KhaiFrost, our patient data is fully encrypted and compliant. We finally have peace of mind.",
          vi: "Nhờ KhaiFrost, dữ liệu bệnh nhân của chúng tôi được mã hoá và tuân thủ đầy đủ. Chúng tôi thực sự yên tâm!",
        },
        name: "Ngô Thị Lan Phương",
        role: "CIO, MediCare Health System",
        avatar: "/images/placeholders/testimonial-3.jpg",
      },
      {
        id: "t3",
        quote: {
          en: "Handing over infrastructure management to KhaiFrost freed our team to focus on growth, with security handled expertly.",
          vi: "Giao quản lý hạ tầng cho KhaiFrost giúp đội ngũ chúng tôi tập trung phát triển, trong khi bảo mật được xử lý chuyên nghiệp.",
        },
        name: "Bùi Anh Quân",
        role: "Operations Manager, SwiftLine Logistics",
        avatar: "/images/placeholders/testimonial-4.jpg",
      },
    ],
    faq: [
      {
        question: {
          en: "How quickly can you respond to a security incident?",
          vi: "Thời gian phản hồi khi có sự cố bảo mật là bao lâu?",
        },
        answer: {
          en: "Our 24/7 monitoring team typically detects and begins responding to incidents within minutes.",
          vi: "Đội ngũ giám sát 24/7 thường phát hiện và bắt đầu xử lý sự cố chỉ trong vài phút.",
        },
      },
      {
        question: {
          en: "Do you offer penetration testing as a one-time service?",
          vi: "Có cung cấp dịch vụ pentest theo hình thức một lần không?",
        },
        answer: {
          en: "Yes, we offer both one-time penetration testing and ongoing periodic testing as part of a managed security plan.",
          vi: "Có, chúng tôi cung cấp cả pentest một lần và kiểm thử định kỳ theo gói bảo mật được quản lý.",
        },
      },
      {
        question: {
          en: "Can you help us achieve ISO 27001 or SOC 2 compliance?",
          vi: "Có hỗ trợ đạt chuẩn ISO 27001 hoặc SOC 2 không?",
        },
        answer: {
          en: "Yes, our team guides you through the compliance process, from gap assessment to implementation and audit support.",
          vi: "Có, đội ngũ sẽ đồng hành cùng bạn trong quá trình đạt chuẩn, từ đánh giá khoảng trống đến triển khai và hỗ trợ audit.",
        },
      },
      {
        question: {
          en: "Do you handle infrastructure management for small businesses too?",
          vi: "Có hỗ trợ quản lý hạ tầng cho doanh nghiệp nhỏ không?",
        },
        answer: {
          en: "Absolutely. We offer flexible managed infrastructure plans that scale from small businesses to large enterprises.",
          vi: "Hoàn toàn có. Chúng tôi có các gói quản lý hạ tầng linh hoạt, phù hợp từ doanh nghiệp nhỏ đến tập đoàn lớn.",
        },
      },
      {
        question: {
          en: "What industries have you worked with?",
          vi: "Đã từng làm việc với những ngành nào?",
        },
        answer: {
          en: "We've secured systems for finance, healthcare, logistics and e-commerce businesses, among others.",
          vi: "Chúng tôi đã bảo mật hệ thống cho các doanh nghiệp tài chính, y tế, logistics, thương mại điện tử và nhiều ngành khác.",
        },
      },
    ],
  },
  {
    slug: "software-api-development",
    categoryName: { en: "Software & API Development", vi: "Phát triển phần mềm & API" },
    heroTitle: {
      en: "Custom Software Built to Scale With You",
      vi: "Phần mềm tuỳ chỉnh, sẵn sàng mở rộng cùng bạn",
    },
    heroSubtitle: {
      en: "From web applications to robust APIs and mobile apps, we build custom software that fits your business processes and grows with your needs.",
      vi: "Từ ứng dụng web đến API mạnh mẽ và ứng dụng di động, chúng tôi xây dựng phần mềm tuỳ chỉnh phù hợp với quy trình và phát triển cùng nhu cầu của doanh nghiệp.",
    },
    heroImage: "/images/services/software-api.jpg",
    stats: [
      {
        icon: "rocket",
        value: "90+",
        label: { en: "Software Projects Delivered", vi: "Dự án phần mềm đã triển khai" },
        description: {
          en: "Web apps, APIs and mobile apps",
          vi: "Ứng dụng web, API và ứng dụng di động",
        },
      },
      {
        icon: "trendingUp",
        value: "+45%",
        label: { en: "Avg. Time-to-Market Improvement", vi: "Rút ngắn thời gian ra mắt trung bình" },
        description: {
          en: "Compared to in-house development timelines",
          vi: "So với thời gian phát triển nội bộ",
        },
      },
      {
        icon: "clock",
        value: "8+",
        label: { en: "Years of Experience", vi: "Năm kinh nghiệm" },
        description: {
          en: "Building software for businesses of all sizes",
          vi: "Xây dựng phần mềm cho doanh nghiệp mọi quy mô",
        },
      },
      {
        icon: "users",
        value: "70+",
        label: { en: "Active Clients", vi: "Khách hàng đang dùng" },
        description: {
          en: "In Vietnam and the USA",
          vi: "Tại Việt Nam và Mỹ",
        },
      },
    ],
    productsEyebrow: { en: "Our Services", vi: "Dịch vụ của chúng tôi" },
    productsHeading: {
      en: "Software & API Development Solutions",
      vi: "Các giải pháp Phát triển phần mềm & API",
    },
    productsIntro: {
      en: "From custom web applications to mobile apps and system integrations, we build software that solves your real business problems.",
      vi: "Từ ứng dụng web tuỳ chỉnh đến ứng dụng di động và tích hợp hệ thống, chúng tôi xây dựng phần mềm giải quyết đúng bài toán của doanh nghiệp.",
    },
    products: [
      {
        id: "p1",
        name: { en: "Custom Web Application", vi: "Ứng dụng Web tuỳ chỉnh" },
        description: {
          en: "Build web applications tailored to your exact business workflows and requirements.",
          vi: "Xây dựng ứng dụng web phù hợp chính xác với quy trình và yêu cầu của doanh nghiệp.",
        },
        image: "/images/service-categories/software-api-development/product-1.jpg",
        duration: "02:20",
        tags: ["Next.js", "React", "Node.js"],
        href: "/dich-vu/software-api-development#custom-web-application",
      },
      {
        id: "p2",
        name: { en: "RESTful & GraphQL API Development", vi: "Phát triển API RESTful & GraphQL" },
        description: {
          en: "Design and build secure, well-documented APIs that power your applications and integrations.",
          vi: "Thiết kế và xây dựng API bảo mật, tài liệu đầy đủ cho ứng dụng và tích hợp của bạn.",
        },
        image: "/images/service-categories/software-api-development/product-2.jpg",
        duration: "02:05",
        tags: ["REST", "GraphQL", "API"],
        href: "/dich-vu/software-api-development#api-development",
      },
      {
        id: "p3",
        name: { en: "Mobile App Development", vi: "Phát triển ứng dụng di động" },
        description: {
          en: "Build native and cross-platform mobile apps for iOS and Android.",
          vi: "Xây dựng ứng dụng di động native và cross-platform cho iOS và Android.",
        },
        image: "/images/service-categories/software-api-development/product-3.jpg",
        duration: "02:15",
        tags: ["React Native", "iOS", "Android"],
        href: "/dich-vu/software-api-development#mobile-app-development",
      },
      {
        id: "p4",
        name: { en: "Third-party System Integration", vi: "Tích hợp hệ thống thứ 3" },
        description: {
          en: "Connect your software with payment gateways, CRMs, ERPs and other third-party platforms.",
          vi: "Kết nối phần mềm của bạn với cổng thanh toán, CRM, ERP và các nền tảng thứ 3 khác.",
        },
        image: "/images/service-categories/software-api-development/product-4.jpg",
        duration: "01:55",
        tags: ["Integration", "API", "Webhook"],
        href: "/dich-vu/software-api-development#third-party-integration",
      },
      {
        id: "p5",
        name: { en: "Legacy System Modernization", vi: "Hiện đại hoá hệ thống Legacy" },
        description: {
          en: "Refactor and modernize aging systems into maintainable, scalable software.",
          vi: "Tái cấu trúc và hiện đại hoá hệ thống cũ thành phần mềm dễ bảo trì, dễ mở rộng.",
        },
        image: "/images/service-categories/software-api-development/product-5.jpg",
        duration: "02:10",
        tags: ["Modernization", "Refactoring", "Migration"],
        href: "/dich-vu/software-api-development#legacy-modernization",
      },
      {
        id: "p6",
        name: { en: "Database Architecture & Design", vi: "Thiết kế kiến trúc Database" },
        description: {
          en: "Design efficient, scalable database schemas that keep your data fast and reliable.",
          vi: "Thiết kế schema database hiệu quả, dễ mở rộng để dữ liệu luôn nhanh và đáng tin cậy.",
        },
        image: "/images/service-categories/software-api-development/product-6.jpg",
        duration: "01:48",
        tags: ["Database", "PostgreSQL", "Architecture"],
        href: "/dich-vu/software-api-development#database-architecture",
      },
    ],
    process: [
      {
        step: "01",
        icon: "search",
        title: { en: "Requirements Discovery", vi: "Khảo sát yêu cầu" },
        description: {
          en: "Understand your business goals, users and technical constraints.",
          vi: "Tìm hiểu mục tiêu kinh doanh, người dùng và ràng buộc kỹ thuật.",
        },
      },
      {
        step: "02",
        icon: "lightbulb",
        title: { en: "Solution & Architecture Design", vi: "Thiết kế giải pháp & kiến trúc" },
        description: {
          en: "Propose the right tech stack, architecture and product roadmap.",
          vi: "Đề xuất tech stack, kiến trúc và lộ trình sản phẩm phù hợp.",
        },
      },
      {
        step: "03",
        icon: "settings",
        title: { en: "Build & Test", vi: "Phát triển & kiểm thử" },
        description: {
          en: "Develop iteratively with continuous testing and stakeholder feedback.",
          vi: "Phát triển theo từng giai đoạn, kiểm thử liên tục và tiếp nhận phản hồi.",
        },
      },
      {
        step: "04",
        icon: "lineChart",
        title: { en: "Launch & Support", vi: "Ra mắt & hỗ trợ" },
        description: {
          en: "Deploy to production and provide ongoing maintenance and improvements.",
          vi: "Triển khai lên production và hỗ trợ bảo trì, cải tiến liên tục.",
        },
      },
    ],
    whyUs: [
      {
        icon: "briefcase",
        title: { en: "Full-Cycle Development Expertise", vi: "Kinh nghiệm phát triển trọn vòng đời" },
        description: {
          en: "From discovery to launch and support, our team handles the entire software lifecycle.",
          vi: "Từ khảo sát đến ra mắt và hỗ trợ, đội ngũ phụ trách toàn bộ vòng đời phần mềm.",
        },
      },
      {
        icon: "bolt",
        title: { en: "Fast, Iterative Delivery", vi: "Triển khai nhanh, theo từng giai đoạn" },
        description: {
          en: "Agile development cycles that get working software into your hands sooner.",
          vi: "Quy trình Agile giúp bạn sớm có phần mềm hoạt động để thử nghiệm và phản hồi.",
        },
      },
      {
        icon: "shield",
        title: { en: "Clean, Secure Code", vi: "Code sạch, bảo mật" },
        description: {
          en: "We follow best practices for code quality, testing and security from day one.",
          vi: "Tuân thủ các nguyên tắc chất lượng code, kiểm thử và bảo mật ngay từ đầu.",
        },
      },
      {
        icon: "headset",
        title: { en: "Long-Term Maintenance Support", vi: "Hỗ trợ bảo trì lâu dài" },
        description: {
          en: "Our team stays available for updates, fixes and feature enhancements after launch.",
          vi: "Đội ngũ luôn sẵn sàng cập nhật, sửa lỗi và bổ sung tính năng sau khi ra mắt.",
        },
      },
    ],
    caseStudies: [
      {
        id: "c1",
        name: {
          en: "Custom Retail App for UrbanMart Retail",
          vi: "Ứng dụng bán lẻ tuỳ chỉnh cho UrbanMart",
        },
        description: {
          en: "Built a custom retail app that streamlined inventory and boosted online sales.",
          vi: "Xây dựng ứng dụng bán lẻ tuỳ chỉnh giúp tinh gọn quản lý kho và tăng doanh số online.",
        },
        image: "/images/service-categories/software-api-development/case-1.jpg",
        duration: "02:15",
        tags: ["Retail", "Web App", "API"],
      },
      {
        id: "c2",
        name: {
          en: "System Integration for GreenLeaf SME Group",
          vi: "Tích hợp hệ thống cho GreenLeaf SME Group",
        },
        description: {
          en: "Connected accounting, CRM and warehouse systems into a single unified workflow.",
          vi: "Kết nối hệ thống kế toán, CRM và kho hàng thành một quy trình thống nhất.",
        },
        image: "/images/service-categories/software-api-development/case-2.jpg",
        duration: "02:00",
        tags: ["Integration", "SME", "API"],
      },
      {
        id: "c3",
        name: {
          en: "Mobile App for NextGen Tech Startup",
          vi: "Ứng dụng di động cho startup NextGen Tech",
        },
        description: {
          en: "Delivered a cross-platform mobile app from concept to App Store launch in 10 weeks.",
          vi: "Xây dựng ứng dụng di động cross-platform từ ý tưởng đến ra mắt App Store chỉ trong 10 tuần.",
        },
        image: "/images/service-categories/software-api-development/case-3.jpg",
        duration: "02:10",
        tags: ["Mobile", "Startup", "React Native"],
      },
    ],
    testimonials: [
      {
        id: "t1",
        quote: {
          en: "KhaiFrost built our retail app exactly to spec and delivered on time. Online sales grew significantly within the first month.",
          vi: "KhaiFrost xây dựng ứng dụng bán lẻ đúng yêu cầu và đúng tiến độ. Doanh số online tăng đáng kể ngay trong tháng đầu!",
        },
        name: "Lý Gia Bảo",
        role: "Founder, UrbanMart Retail",
        avatar: "/images/placeholders/testimonial-5.jpg",
      },
      {
        id: "t2",
        quote: {
          en: "Our accounting, CRM and warehouse systems finally talk to each other, thanks to KhaiFrost's integration work.",
          vi: "Hệ thống kế toán, CRM và kho hàng của chúng tôi cuối cùng đã liên thông với nhau nhờ KhaiFrost.",
        },
        name: "Đặng Thu Hương",
        role: "Operations Director, GreenLeaf SME Group",
        avatar: "/images/placeholders/testimonial-6.jpg",
      },
      {
        id: "t3",
        quote: {
          en: "From idea to App Store in just 10 weeks. KhaiFrost's team moved fast without sacrificing quality.",
          vi: "Từ ý tưởng đến App Store chỉ trong 10 tuần. Đội ngũ KhaiFrost làm việc nhanh mà vẫn đảm bảo chất lượng!",
        },
        name: "Hoàng Minh Đức",
        role: "CEO, NextGen Tech",
        avatar: "/images/placeholders/testimonial-2.jpg",
      },
    ],
    faq: [
      {
        question: {
          en: "How long does a custom software project take?",
          vi: "Dự án phần mềm tuỳ chỉnh mất bao lâu?",
        },
        answer: {
          en: "Depending on scope, most web or mobile apps take 6–12 weeks. Larger, more complex systems may take 3–6 months.",
          vi: "Tuỳ phạm vi dự án, hầu hết ứng dụng web hoặc di động mất khoảng 6–12 tuần. Các hệ thống lớn, phức tạp hơn có thể mất 3–6 tháng.",
        },
      },
      {
        question: {
          en: "Do you build both web and mobile apps?",
          vi: "Có xây dựng cả ứng dụng web và di động không?",
        },
        answer: {
          en: "Yes, we build web applications, native and cross-platform mobile apps, and the APIs that connect them.",
          vi: "Có, chúng tôi xây dựng ứng dụng web, ứng dụng di động native và cross-platform, cùng các API kết nối chúng.",
        },
      },
      {
        question: {
          en: "Can you modernize our existing legacy system?",
          vi: "Có thể hiện đại hoá hệ thống legacy hiện tại không?",
        },
        answer: {
          en: "Yes. We assess your current system, then refactor or rebuild it incrementally to minimize business disruption.",
          vi: "Có. Chúng tôi đánh giá hệ thống hiện tại, sau đó tái cấu trúc hoặc xây dựng lại từng phần để giảm thiểu gián đoạn kinh doanh.",
        },
      },
      {
        question: {
          en: "Who owns the source code after the project is done?",
          vi: "Ai sở hữu mã nguồn sau khi dự án hoàn thành?",
        },
        answer: {
          en: "You do. All source code and documentation are fully transferred to you upon project completion.",
          vi: "Bạn sở hữu toàn bộ. Mã nguồn và tài liệu được bàn giao đầy đủ khi dự án hoàn thành.",
        },
      },
      {
        question: {
          en: "Do you offer maintenance after launch?",
          vi: "Có hỗ trợ bảo trì sau khi ra mắt không?",
        },
        answer: {
          en: "Yes, we offer flexible maintenance packages covering bug fixes, updates and new feature development.",
          vi: "Có, chúng tôi cung cấp các gói bảo trì linh hoạt bao gồm sửa lỗi, cập nhật và phát triển tính năng mới.",
        },
      },
    ],
  },
];

export function getServiceCategoryBySlug(
  slug: string
): ServiceCategoryDetail | undefined {
  return serviceCategoryDetails.find((category) => category.slug === slug);
}
