"use client";

import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/api";
import { useNotifications, useMarkNotificationRead } from "../hooks";
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
  if (yesterdayItems.length > 0)
    groups.push({ label: "Ontem", items: yesterdayItems });
  if (olderItems.length > 0)
    groups.push({ label: "Anteriores", items: olderItems });
  return groups;
}

export default function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();

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
                  className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
                    notification.readAt
                      ? "border-border"
                      : "border-info/30 bg-info/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.readAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={markRead.isPending}
                        onClick={() => {
                          markRead.mutate(notification.id, {
                            onSuccess: () => {
                              void queryClient.invalidateQueries({
                                queryKey: ["notifications"],
                              });
                            },
                          });
                        }}
                      >
                        Marcar como lida
                      </Button>
                    ) : null}
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
