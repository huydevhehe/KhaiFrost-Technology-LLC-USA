export interface AdminTestimonial {
  id: string;
  clientName: string;
  company: string;
  quote: string;
  rating: number;
  location: string;
  avatar: string;
}

export const mockTestimonials: AdminTestimonial[] = [
  {
    id: "TST-001",
    clientName: "John Smith",
    company: "KhaiFrost Client",
    quote: "KhaiFrost đã giúp doanh nghiệp chúng tôi chuyển đổi số nhanh chóng và hiệu quả.",
    rating: 5,
    location: "Houston, TX, USA",
    avatar: "/images/placeholders/testimonial-1.jpg",
  },
  {
    id: "TST-002",
    clientName: "Emily Nguyen",
    company: "Tech Retail Co.",
    quote: "Đội ngũ chuyên nghiệp, phản hồi nhanh và giải pháp AI thực sự tạo ra giá trị.",
    rating: 5,
    location: "San Jose, CA, USA",
    avatar: "/images/placeholders/testimonial-2.jpg",
  },
  {
    id: "TST-003",
    clientName: "Robert Chen",
    company: "Chen Logistics",
    quote: "Hạ tầng AWS được tối ưu hoá giúp chúng tôi tiết kiệm đáng kể chi phí vận hành.",
    rating: 4,
    location: "Dallas, TX, USA",
    avatar: "/images/placeholders/testimonial-3.jpg",
  },
  {
    id: "TST-004",
    clientName: "Lisa Tran",
    company: "Tran Foods",
    quote: "Dịch vụ bảo mật và giám sát 24/7 mang lại sự an tâm tuyệt đối.",
    rating: 5,
    location: "Ho Chi Minh City, Vietnam",
    avatar: "/images/placeholders/testimonial-4.jpg",
  },
];
