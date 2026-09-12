"use client";

import { useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/api";
import {
  useNotifications,
  useMarkNotificationRead,
  useDeleteNotification,
} from "../hooks";
import type { AppNotification } from "../api";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function groupByDay(items: AppNotification[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const groups: Array<{ label: string; items: typeof items }> = [];
  const todayItems: typeof items = [];
  const yesterdayItems: typeof items = [];
  const olderItems: typeof items = [];

  for (const item of items) {
    const date = new Date(item.createdAt);
    if (isSameDay(date, today)) todayItems.push(item);
    else if (isSameDay(date, yesterday)) yesterdayItems.push(item);
    else olderItems.push(item);
  }

  if (todayItems.length > 0) groups.push({ label: "Hoje", items: todayItems });
  if (yesterdayItems.length > 0) {
    groups.push({ label: "Ontem", items: yesterdayItems });
  }
  if (olderItems.length > 0) {
    groups.push({ label: "Anteriores", items: olderItems });
  }
  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function openNotification(notification: AppNotification) {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }
    if (notification.tripId) {
      router.push(`/viagens/${notification.tripId}`);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const groups = groupByDay(data ?? []);

  if (groups.length === 0) {
    return (
      <EmptyState
        emoji="🔔"
        title="Nenhuma notificação"
        description="Quando algo acontecer com suas viagens e despesas, você será avisado aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((notification) => (
              <li key={notification.id}>
                <div
                  className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${notification.readAt
                      ? "border-border"
                      : "border-info/30 bg-info/5"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 text-left ${notification.tripId
                          ? "cursor-pointer rounded-lg outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                          : "cursor-default"
                        }`}
                      onClick={() => openNotification(notification)}
                      disabled={!notification.tripId}
                      title={notification.tripId ? "Abrir viagem" : undefined}
                    >
                      <p className="text-sm text-foreground">
                        {notification.message}
                      </p>
                      {notification.detail ? (
                        <p className="mt-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs text-foreground">
                          <span className="font-medium text-muted-foreground">
                            Comentário:
                          </span>{" "}
                          {notification.detail}
                        </p>
                      ) : null}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDateTime(notification.createdAt)}</span>
                        {notification.tripId ? (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            Abrir viagem
                            <ArrowRight className="size-3" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {!notification.readAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          disabled={markRead.isPending}
                          onClick={() => markRead.mutate(notification.id)}
                        >
                          Marcar como lida
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover notificação"
                        disabled={
                          remove.isPending &&
                          pendingDeleteId === notification.id
                        }
                        onClick={() => {
                          setPendingDeleteId(notification.id);
                          remove.mutate(notification.id, {
                            onSettled: () => setPendingDeleteId(null),
                          });
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
