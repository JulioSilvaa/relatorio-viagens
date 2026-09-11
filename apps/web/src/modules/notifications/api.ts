import { apiFetch } from "@/lib/api";

export interface AppNotification {
  id: string;
  event: string;
  message: string;
  detail: string | null;
  tripId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface RealtimeNotification {
  id: string;
  event: string;
  message: string;
  detail: string | null;
  tripId: string | null;
  createdAt: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  const data = await apiFetch<{ data: AppNotification[] }>(
    "/api/notifications",
  );
  return Array.isArray(data.data)
    ? data.data
    : (data as unknown as AppNotification[]);
}

export async function unreadCount(): Promise<number> {
  const data = await apiFetch<{ unread: number }>(
    "/api/notifications/nao-lidas",
  );
  return data.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/${id}/lida`, { method: "PATCH" });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/${id}`, { method: "DELETE" });
}
