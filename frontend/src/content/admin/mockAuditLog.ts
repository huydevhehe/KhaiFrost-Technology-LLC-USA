export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
}

export const mockAuditLog: AdminAuditEntry[] = [
  { id: "LOG-001", timestamp: "18/06/2025 09:24", actor: "Nguyễn Văn A", action: "Đăng nhập", target: "Hệ thống", ip: "203.113.45.10" },
  { id: "LOG-002", timestamp: "18/06/2025 09:31", actor: "Trần Thị B", action: "Cập nhật bài viết", target: "POST-002", ip: "203.113.45.22" },
  { id: "LOG-003", timestamp: "17/06/2025 16:02", actor: "Lê Văn C", action: "Tạo dự án mới", target: "PRJ-006", ip: "118.70.12.5" },
  { id: "LOG-004", timestamp: "17/06/2025 14:47", actor: "Nguyễn Văn A", action: "Khoá tài khoản", target: "USR-004", ip: "203.113.45.10" },
  { id: "LOG-005", timestamp: "16/06/2025 11:18", actor: "Phạm Thị D", action: "Cập nhật SEO", target: "Trang chủ", ip: "42.117.88.3" },
  { id: "LOG-006", timestamp: "16/06/2025 08:55", actor: "Hoàng Văn E", action: "Tải lên media", target: "MED-010", ip: "42.117.88.9" },
  { id: "LOG-007", timestamp: "15/06/2025 17:40", actor: "Trần Thị B", action: "Phản hồi liên hệ", target: "CTC-003", ip: "203.113.45.22" },
  { id: "LOG-008", timestamp: "15/06/2025 10:05", actor: "Nguyễn Văn A", action: "Thay đổi cài đặt chung", target: "Company Settings", ip: "203.113.45.10" },
];
