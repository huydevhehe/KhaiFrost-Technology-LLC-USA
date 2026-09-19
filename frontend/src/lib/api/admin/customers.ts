// Customer accounts (/admin/customers).
// Mirrors backend/src/modules/customers/dto/customer.dto.ts.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";
import type { UserStatus } from "./users";

export interface AdminCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: UserStatus;
  avatarUrl: string | null;
  preferredLocale: Locale;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
}

export interface ListCustomersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface CreateCustomerInput {
  fullName: string;
  email: string;
  phone: string;
  /** Omit to let the server generate a temporary password. */
  password?: string;
}

export interface AdminCustomerWithTemporaryPassword extends AdminCustomer {
  /** Returned exactly once, right after create. */
  temporaryPassword?: string;
}

export interface CustomerPage {
  items: AdminCustomer[];
  meta: PaginationMeta;
}

export const customersApi = {
  list: async (query: ListCustomersQuery = {}, signal?: AbortSignal): Promise<CustomerPage> => {
    const result = await api.getWithMeta<AdminCustomer[], PaginationMeta>(
      "/admin/customers",
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  get: (id: string, signal?: AbortSignal): Promise<AdminCustomer> =>
    api.get<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}`, undefined, { signal }),

  /** `temporaryPassword` is present only when `password` was omitted. */
  create: (input: CreateCustomerInput): Promise<AdminCustomerWithTemporaryPassword> =>
    api.post<AdminCustomerWithTemporaryPassword>("/admin/customers", input),

  lock: (id: string): Promise<AdminCustomer> =>
    api.post<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}/lock`),

  unlock: (id: string): Promise<AdminCustomer> =>
    api.post<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}/unlock`),

  remove: (id: string): Promise<void> =>
    api.delete<void>(`/admin/customers/${encodeURIComponent(id)}`),
};
