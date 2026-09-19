// Contact inbox (/admin/contacts).
// Mirrors backend/src/modules/contacts/dto/contact.dto.ts.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";

export const CONTACT_STATUSES = ["new", "seen", "replied", "archived"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Mới",
  seen: "Đã xem",
  replied: "Đã phản hồi",
  archived: "Lưu trữ",
};

/** Statuses a contact may move to next (mirrors the backend transition table). */
export const CONTACT_STATUS_TRANSITIONS: Record<ContactStatus, ContactStatus[]> = {
  new: ["seen", "archived"],
  seen: ["replied", "archived"],
  replied: ["archived"],
  archived: [],
};

export interface ContactListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string | null;
  messagePreview: string;
  status: ContactStatus;
  assignedToId: string | null;
  locale: Locale;
  isSpam: boolean;
  createdAt: string;
}

export interface ContactDetail extends ContactListItem {
  message: string;
  sourcePage: string | null;
  handledAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  version: number;
  updatedAt: string;
}

export interface ContactNote {
  id: string;
  contactId: string;
  authorId: string | null;
  note: string;
  createdAt: string;
}

export interface ContactListMeta extends PaginationMeta {
  unreadCount: number;
}

export interface ListContactsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ContactStatus;
  assignedToId?: string;
  /** ISO date (inclusive). */
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface ContactPage {
  items: ContactListItem[];
  meta: ContactListMeta;
}

export interface ContactSummary {
  new: number;
  seen: number;
  replied: number;
  archived: number;
  total: number;
}

/** Backend limit for an internal note. */
export const CONTACT_NOTE_MAX = 2000;

export const contactsApi = {
  list: async (query: ListContactsQuery = {}, signal?: AbortSignal): Promise<ContactPage> => {
    const result = await api.getWithMeta<ContactListItem[], ContactListMeta>(
      "/admin/contacts",
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  summary: (signal?: AbortSignal): Promise<ContactSummary> =>
    api.get<ContactSummary>("/admin/contacts/summary", undefined, { signal }),

  /** Reading never changes the status; call `updateStatus` explicitly. */
  get: (id: string, signal?: AbortSignal): Promise<ContactDetail> =>
    api.get<ContactDetail>(`/admin/contacts/${encodeURIComponent(id)}`, undefined, { signal }),

  updateStatus: (id: string, status: ContactStatus): Promise<ContactDetail> =>
    api.patch<ContactDetail>(`/admin/contacts/${encodeURIComponent(id)}/status`, { status }),

  /** `assignedToId: null` clears the assignment. */
  assign: (id: string, assignedToId: string | null): Promise<ContactDetail> =>
    api.post<ContactDetail>(`/admin/contacts/${encodeURIComponent(id)}/assign`, { assignedToId }),

  listNotes: (id: string, signal?: AbortSignal): Promise<ContactNote[]> =>
    api.get<ContactNote[]>(`/admin/contacts/${encodeURIComponent(id)}/notes`, undefined, { signal }),

  addNote: (id: string, note: string): Promise<ContactNote> =>
    api.post<ContactNote>(`/admin/contacts/${encodeURIComponent(id)}/notes`, { note }),

  remove: (id: string): Promise<void> => api.delete<void>(`/admin/contacts/${encodeURIComponent(id)}`),
};
