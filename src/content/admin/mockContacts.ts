export type ContactStatus = "Mới" | "Đã xem" | "Đã phản hồi";

export interface AdminContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  status: ContactStatus;
}

export const mockContacts: AdminContact[] = [
  {
    id: "CTC-001",
    name: "Nguyễn Minh Khôi",
    email: "khoi.nguyen@example.com",
    phone: "+1 713-555-0142",
    message:
      "Chúng tôi đang tìm kiếm đối tác triển khai hệ thống giám sát kho lạnh cho 3 nhà máy tại Houston. Mong nhận được tư vấn chi tiết về giải pháp và chi phí.",
    date: "15/06/2025",
    status: "Mới",
  },
  {
    id: "CTC-002",
    name: "Sarah Johnson",
    email: "sarah.j@coldchainco.com",
    phone: "+1 281-555-0198",
    message: "Interested in your AWS Cloud migration service for our logistics platform. Please share more details.",
    date: "14/06/2025",
    status: "Đã xem",
  },
  {
    id: "CTC-003",
    name: "Trần Bảo Ngọc",
    email: "ngoc.tran@example.com",
    phone: "+84 902-333-111",
    message: "Xin chào, công ty tôi cần giải pháp AI receptionist cho văn phòng tại TP.HCM. Vui lòng liên hệ lại.",
    date: "12/06/2025",
    status: "Đã phản hồi",
  },
  {
    id: "CTC-004",
    name: "David Lee",
    email: "david.lee@example.com",
    phone: "+1 832-555-0177",
    message: "Requesting a quote for a managed infrastructure contract covering 24/7 monitoring.",
    date: "10/06/2025",
    status: "Mới",
  },
];
