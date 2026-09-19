// Back office (staff) accounts (/admin/users).
// Mirrors backend/src/modules/users/dto/*.

import { api } from "../client";
import type { Locale, PaginationMeta, Role } from "../types";

/** Roles a back office account can have. Customers are managed elsewhere. */
export const STAFF_ROLES = ["owner", "admin", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type UserStatus = "active" | "locked";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  avatarId: string | null;
  avatarUrl: string | null;
  preferredLocale: Locale;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AdminUserWithTemporaryPassword extends AdminUser {
  /** Returned exactly once, right after create or reset-password. */
  temporaryPassword?: string;
}

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: StaffRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone: string;
  /** Optional: the server defaults to the only role the signed-in user may create. */
  role?: StaffRole;
  /** Omit to let the server generate a temporary password. */
  password?: string;
}

export interface UpdateUserInput {
  /** Version last read (optimistic locking). */
  version: number;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  avatarId?: string | null;
}

export interface UserPage {
  items: AdminUser[];
  meta: PaginationMeta;
}

/** Backend limits, mirrored so the form can validate before sending. */
export const USER_LIMITS = {
  fullNameMax: 150,
  emailMax: 254,
  phoneMax: 32,
  passwordMin: 10,
  passwordMax: 128,
} as const;

export const USER_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Quản trị viên.",
  admin: "Quản trị viên",
  staff: "Nhân viên",
};

export const USER_ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: "Toàn quyền hệ thống. Chỉ hiển thị với các tài khoản cùng vai trò.",
  admin: "Quản trị nội dung, tạo và quản lý tài khoản nhân viên và khách hàng.",
  staff: "Biên tập nội dung trong phạm vi được cấp quyền.",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Đang hoạt động",
  locked: "Đã khoá",
};

/**
 * Roles the signed-in user may create or assign to an existing account
 * (owner: admin or staff, admin: staff only). Nobody can assign the owner role.
 */
export function assignableRoles(actorRole: Role | undefined): StaffRole[] {
  if (actorRole === "owner") return ["admin", "staff"];
  if (actorRole === "admin") return ["staff"];
  return [];
}

/** Roles the signed-in user may know about: owner accounts are invisible to everyone else. */
export function visibleRoles(actorRole: Role | undefined): StaffRole[] {
  return actorRole === "owner" ? [...STAFF_ROLES] : STAFF_ROLES.filter((role) => role !== "owner");
}

/** True when the signed-in user may edit/lock/delete the given account (never an owner). */
export function canManageUser(actorRole: Role | undefined, targetRole: Role): boolean {
  return assignableRoles(actorRole).includes(targetRole as StaffRole);
}

export const usersApi = {
  list: async (query: ListUsersQuery = {}, signal?: AbortSignal): Promise<UserPage> => {
    const result = await api.getWithMeta<AdminUser[], PaginationMeta>("/admin/users", { ...query }, { signal });
    return { items: result.data, meta: result.meta };
  },

  get: (id: string, signal?: AbortSignal): Promise<AdminUser> =>
    api.get<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, undefined, { signal }),

  /** `temporaryPassword` is present only when `password` was omitted. */
  create: (input: CreateUserInput): Promise<AdminUserWithTemporaryPassword> =>
    api.post<AdminUserWithTemporaryPassword>("/admin/users", input),

  /** Rejected with 409 VERSION_CONFLICT when someone else saved first. */
  update: (id: string, input: UpdateUserInput): Promise<AdminUser> =>
    api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, input),

  lock: (id: string): Promise<AdminUser> =>
    api.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/lock`),

  unlock: (id: string): Promise<AdminUser> =>
    api.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/unlock`),

  /** Returns a new temporary password once and signs the user out everywhere. */
  resetPassword: (id: string): Promise<AdminUserWithTemporaryPassword> =>
    api.post<AdminUserWithTemporaryPassword>(`/admin/users/${encodeURIComponent(id)}/reset-password`),

  remove: (id: string): Promise<void> => api.delete<void>(`/admin/users/${encodeURIComponent(id)}`),
};
