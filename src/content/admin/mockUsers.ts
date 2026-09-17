export type UserRole = "Owner" | "Admin" | "Staff";
export type UserStatus = "Active" | "Locked";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdDate: string;
  twoFactorEnabled: boolean;
}

export const roleDescriptions: Record<UserRole, string> = {
  Owner: "Toàn quyền quản trị hệ thống, bao gồm quản lý người dùng và thanh toán.",
  Admin: "Quản lý nội dung, người dùng và cấu hình website.",
  Staff: "Chỉ được phép chỉnh sửa nội dung được phân công.",
};

export const mockUsers: AdminUser[] = [
  {
    id: "USR-001",
    name: "Nguyễn Văn A",
    email: "admin@khaifrost.com",
    role: "Owner",
    status: "Active",
    createdDate: "10/03/2024",
    twoFactorEnabled: true,
  },
  {
    id: "USR-002",
    name: "Trần Thị B",
    email: "tranthib@khaifrost.com",
    role: "Admin",
    status: "Active",
    createdDate: "15/04/2024",
    twoFactorEnabled: true,
  },
  {
    id: "USR-003",
    name: "Lê Văn C",
    email: "levanc@khaifrost.com",
    role: "Staff",
    status: "Active",
    createdDate: "20/05/2024",
    twoFactorEnabled: false,
  },
  {
    id: "USR-004",
    name: "Phạm Thị D",
    email: "phamthid@khaifrost.com",
    role: "Staff",
    status: "Locked",
    createdDate: "01/06/2024",
    twoFactorEnabled: false,
  },
  {
    id: "USR-005",
    name: "Hoàng Văn E",
    email: "hoangvane@khaifrost.com",
    role: "Staff",
    status: "Active",
    createdDate: "15/08/2024",
    twoFactorEnabled: true,
  },
];
