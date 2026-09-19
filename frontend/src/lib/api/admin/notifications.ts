import { api } from "../client";
import type { AdminNotification, Locale, NotificationListMeta } from "../types";

export interface NotificationsQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  locale?: Locale;
}

export interface NotificationsPage {
  items: AdminNotification[];
  meta: NotificationListMeta;
}

export const notificationsApi = {
  list: async (query: NotificationsQuery = {}): Promise<NotificationsPage> => {
    const result = await api.getWithMeta<AdminNotification[], NotificationListMeta>("/admin/notifications", {
      locale: "vi",
      ...query,
    });
    return { items: result.data, meta: result.meta };
  },
  unreadCount: async (): Promise<number> => {
    const result = await api.get<{ count: number }>("/admin/notifications/unread-count");
    return result.count;
  },
  markRead: (id: string, locale: Locale = "vi") =>
    api.post<AdminNotification>(`/admin/notifications/${encodeURIComponent(id)}/read`, undefined, {
      query: { locale },
    }),
  markAllRead: () => api.post<{ updated: number }>("/admin/notifications/read-all"),
  remove: (id: string) => api.delete<void>(`/admin/notifications/${encodeURIComponent(id)}`),
};
