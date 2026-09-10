"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Briefcase, Home, Plus, User } from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useNewNotificationAlert, useUnreadCount } from "@/modules/notifications/hooks";
import { ConnectivityIndicator } from "./connectivity-indicator";
import { UserMenu } from "./user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/viagens", label: "Viagens", icon: Briefcase },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

function NotificationBadge({ count }: { count: number }) {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <Link href="/inicio" className="text-lg font-semibold tracking-tight">
        VDR
      </Link>
      <UserMenu />
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();

  const first = NAV_ITEMS.slice(0, 2);
  const last = NAV_ITEMS.slice(2);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-5 items-center px-2">
        {first.map((item) => (
          <MobileNavItem
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}
        <Link
          href="/viagens/nova"
          aria-label="Nova viagem"
          className="flex size-14 items-center justify-center self-center justify-self-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/80"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
        {last.map((item) => (
          <MobileNavItem
            key={item.href}
            item={item}
            active={pathname === item.href}
            badge={item.href === "/notificacoes" ? (unread ?? 0) : 0}
          />
        ))}
      </div>
    </nav>
  );
}

function MobileNavItem({
  item,
  active,
  badge,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <item.icon
          className={cn(
            "size-5",
            active ? "text-primary" : "text-muted-foreground",
          )}
        />
        {badge && badge > 0 ? (
          <span className="absolute -right-1.5 -top-1.5">
            <NotificationBadge count={badge} />
          </span>
        ) : null}
      </span>
      {item.label}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { data: unread } = useUnreadCount();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-secondary/50 md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/inicio" className="text-lg font-semibold tracking-tight">
          VDR
        </Link>
      </div>
      <nav
        aria-label="Navegação principal"
        className="flex flex-1 flex-col gap-1 p-3"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/inicio" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/notificacoes" && unread && unread > 0 ? (
                <NotificationBadge count={unread} />
              ) : null}
            </Link>
          );
        })}
        <Link
          href="/viagens/nova"
          className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          Nova viagem
        </Link>
      </nav>
      <div className="border-t border-border p-4">
        <UserMenu />
      </div>
    </aside>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  useNewNotificationAlert();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <ConnectivityIndicator />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 pb-28 md:max-w-4xl md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
