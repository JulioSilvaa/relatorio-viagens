"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, unreadCount } from "./api";
import { playNotificationSound, shouldNotifySound } from "@/lib/notification-sound";

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
    refetchInterval: 15_000,
  });
}

export function useNewNotificationAlert() {
  const { data: unread } = useUnreadCount();
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof unread !== "number") return;
    const previous = previousRef.current;
    previousRef.current = unread;
    if (shouldNotifySound(previous, unread)) {
      playNotificationSound();
    }
  }, [unread]);
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
