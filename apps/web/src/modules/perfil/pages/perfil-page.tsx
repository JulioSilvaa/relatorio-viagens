"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/modules/auth/session-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function field(label: string, value: string) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function PerfilPage() {
  const { user, logout } = useSession();

  async function handleLogout() {
    toast.success("Sessão encerrada.");
    await logout();
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Perfil</h1>

      <Card className="shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="size-14">
            <AvatarFallback>
              {initials || user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {user.department ? `${user.department} · ` : ""}
              {user.cargo ?? user.roleCode}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border p-5 pt-3">
          {field("E-mail", user.email)}
          {user.phone ? field("Telefone", user.phone) : null}
          {user.department ? field("Departamento", user.department) : null}
          {user.cargo ? field("Cargo", user.cargo) : null}
          {field(
            "Perfil",
            user.roleCode === "MANAGER_ADMIN"
              ? "Gestão e administração"
              : "Colaborador",
          )}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => {
          void handleLogout();
        }}
      >
        <LogOut aria-hidden="true" />
        Sair da conta
      </Button>
    </div>
  );
}
