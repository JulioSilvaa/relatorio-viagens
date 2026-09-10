"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, unreadCount, deleteNotification } from "./api";
import { playNotificationSound, shouldNotifySound } from "@/lib/notification-sound";
import { io } from "socket.io-client";

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

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationsKeys.unread,
    queryFn: unreadCount,
    enabled,
    refetchInterval: 15_000,
  });
}

export function useNewNotificationAlert(enabled = true) {
  const { data: unread } = useUnreadCount(enabled);
  const queryClient = useQueryClient();
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof unread !== "number") return;
    const previous = previousRef.current;
    previousRef.current = unread;
    if (shouldNotifySound(previous, unread)) {
      let cancelled = false;
      void queryClient
        .fetchQuery({
          queryKey: notificationsKeys.all,
          queryFn: listNotifications,
        })
        .then(() => {
          if (!cancelled) playNotificationSound();
        });
      return () => {
        cancelled = true;
      };
    }
  }, [queryClient, unread]);
}

export function useNotificationRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      (window.location.port === "3001" ? "http://localhost:3000" : window.location.origin);
    const socket = io(apiUrl, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread });
    };

    socket.on("notification.created", refreshNotifications);
    return () => {
      socket.off("notification.created", refreshNotifications);
      socket.disconnect();
    };
  }, [enabled, queryClient]);
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: notificationsKeys.unread,
      });
    },
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
