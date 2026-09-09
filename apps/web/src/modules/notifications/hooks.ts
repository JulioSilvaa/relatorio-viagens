"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, unreadCount } from "./api";

export const notificationsKeys = {
  all: ["notifications"] as const,
  unread: ["notifications", "unread"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKeys.all,
    queryFn: listNotifications,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationsKeys.unread,
    queryFn: unreadCount,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: notificationsKeys.unread,
      });
    },
  });
}
