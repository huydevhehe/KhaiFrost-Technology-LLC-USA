import { ROLES } from "@/lib/api/types";
import type { AuthUser, Permission } from "@/lib/api/types";

export function hasPermission(user: AuthUser | null | undefined, permission: Permission): boolean {
  return !!user && user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/** Staff, admin and owner may enter the admin area (after the elevated session). */
export function isStaff(user: AuthUser | null | undefined): boolean {
  return !!user && user.role !== ROLES.CUSTOMER;
}

export function roleLabel(role: AuthUser["role"]): string {
  switch (role) {
    case "owner":
      return "Quản trị viên.";
    case "admin":
      return "Quản trị viên";
    case "staff":
      return "Nhân viên";
    default:
      return "Khách hàng";
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
