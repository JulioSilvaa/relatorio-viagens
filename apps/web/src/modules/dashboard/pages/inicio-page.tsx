"use client";

import Link from "next/link";
import { CircleHelp, Plane } from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useEmployeeReport, useManagerReport } from "../hooks";
import { StatCard } from "../components/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/feedback/empty-state";
import { TripStatusBadge } from "@/modules/trips/components/trip-status-badge";

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

function EmployeeDashboard() {
  const { user } = useSession();
  const { data, isLoading, isError, error, refetch } = useEmployeeReport();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <StatGridSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const pendencias = [
    {
      label: "Relatórios aguardando aprovação",
      count: data.relatoriosAguardandoAprovacao,
    },
    { label: "Relatórios em correção", count: data.relatoriosEmCorrecao },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">
        Olá, {user?.name?.split(" ")[0] ?? ""}
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Viagens em andamento"
          value={data.viagensEmAndamento}
          hint="Precisa de atenção"
          icon={<Plane className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Reembolsos pendentes"
          value={data.reembolsosPendentes}
          hint="Aguardando pagamento"
          icon={<CircleHelp className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Finalizados"
          value={data.relatoriosFinalizados}
          hint="Últimos 30 dias"
        />
        <StatCard
          label="Total reembolsado"
          value={formatMoney(data.totalReembolsado)}
        />
      </div>

      {pendencias.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendências</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendencias.map((item) => (
              <p key={item.label} className="text-sm text-foreground">
                {item.count} {item.label.toLowerCase()}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          emoji="🎉"
          title="Tudo em dia"
          description="Nenhuma pendência no momento. Aproveite o dia!"
        />
      )}

      <Link
        href="/viagens"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80"
      >
        Ver minhas viagens
      </Link>
    </div>
  );
}

function ManagerDashboard() {
  const { data, isLoading, isError, error, refetch } = useManagerReport();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <StatGridSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const topCategories = [...data.porCategoria]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const maxCategory = Math.max(
    1,
    ...topCategories.map((item) => Number(item.total)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Resumo</h1>
        <p className="text-sm text-muted-foreground">
          {data.periodoDe} — {data.periodoAte}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Despesas" value={formatMoney(data.totalDespesas)} />
        <StatCard
          label="Reembolsos"
          value={formatMoney(data.totalReembolsado)}
        />
        <StatCard
          label="Em aprovação"
          value={data.relatoriosPendentes}
          hint="Relatórios"
        />
        <StatCard
          label="Valores pendentes"
          value={formatMoney(data.valoresPendentes)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {topCategories.map((item) => {
            const percentage = (Number(item.total) / maxCategory) * 100;
            return (
              <div
                key={item.categoria?.code ?? "outros"}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {item.categoria?.name ?? "Outros"}
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {formatMoney(item.total)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {data.porColaborador.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por colaborador</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.porColaborador.map((colaborador) => (
              <div
                key={colaborador.id}
                className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
              >
                <span className="text-foreground">{colaborador.nome}</span>
                <span className="font-medium text-muted-foreground">
                  {formatMoney(colaborador.total)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.reembolsosStatus.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Viagens por status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.reembolsosStatus.map((item) => (
              <span
                key={item.status}
                className="inline-flex items-center gap-1.5"
              >
                <TripStatusBadge status={item.status} />
                <span className="text-sm text-muted-foreground">
                  {item.quantidade}
                </span>
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function InicioPage() {
  const { user, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <StatGridSkeleton />
      </div>
    );
  }

  return user?.roleCode === "MANAGER_ADMIN" ? (
    <ManagerDashboard />
  ) : (
    <EmployeeDashboard />
  );
}
