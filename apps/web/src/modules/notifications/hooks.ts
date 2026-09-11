"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listNotifications, markNotificationRead, unreadCount, deleteNotification } from "./api";
import type { RealtimeNotification } from "./api";
import { playNotificationSound, shouldNotifySound } from "@/lib/notification-sound";
import { io } from "socket.io-client";

export const notificationsKeys = {
  all: ["notifications"] as const,
  unread: ["notifications", "unread"] as const,
};

const MAX_REMEMBERED_SOUNDS = 50;
const soundedNotificationIds = new Set<string>();

function rememberSounded(id: string): void {
  soundedNotificationIds.add(id);
  if (soundedNotificationIds.size > MAX_REMEMBERED_SOUNDS) {
    const oldest = soundedNotificationIds.values().next().value;
    if (oldest) soundedNotificationIds.delete(oldest);
  }
}

function wasSounded(id: string): boolean {
  return soundedNotificationIds.has(id);
}

function toAppNotification(payload: RealtimeNotification) {
  return {
    id: payload.id,
    event: payload.event,
    message: payload.message,
    detail: payload.detail,
    tripId: payload.tripId,
    readAt: null,
    createdAt: payload.createdAt,
  };
}

function announceRealtimeNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: RealtimeNotification,
  onNavigate?: (tripId: string) => void,
): void {
  const item = toAppNotification(payload);

  queryClient.setQueryData(notificationsKeys.all, (current) => {
    const list = Array.isArray(current) ? current : [];
    return [item, ...list.filter((existing) => existing.id !== item.id)];
  });
  queryClient.setQueryData(notificationsKeys.unread, (current) => {
    return typeof current === "number" ? current + 1 : current;
  });

  void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread });

  toast.info(payload.message, {
    description: payload.detail ?? undefined,
    ...(onNavigate && payload.tripId
      ? {
          action: {
            label: "Ver viagem",
            onClick: () => onNavigate(payload.tripId as string),
          },
        }
      : {}),
  });

  if (!wasSounded(payload.id)) {
    rememberSounded(payload.id);
    playNotificationSound();
  }
}

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
    if (!shouldNotifySound(previous, unread)) return;

    let cancelled = false;
    void queryClient
      .fetchQuery({
        queryKey: notificationsKeys.all,
        queryFn: listNotifications,
      })
      .then((notifications) => {
        if (cancelled) return;
        const newest = notifications?.[0];
        if (!newest || wasSounded(newest.id)) return;
        rememberSounded(newest.id);
        toast.info(newest.message, {
          description: newest.detail ?? undefined,
        });
        playNotificationSound();
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient, unread]);
}

export function useNotificationRealtime(enabled = true): void {
  const queryClient = useQueryClient();
  const router = useRouter();

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

    const handleNotification = (payload: RealtimeNotification) => {
      announceRealtimeNotification(queryClient, payload, (tripId) => {
        router.push(`/viagens/${tripId}`);
      });
    };

    socket.on("notification.created", handleNotification);
    return () => {
      socket.off("notification.created", handleNotification);
      socket.disconnect();
    };
  }, [enabled, queryClient, router]);
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