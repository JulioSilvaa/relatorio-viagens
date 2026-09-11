"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CircleHelp,
  MapPin,
  Plane,
  Users,
  WalletCards,
} from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useEmployeeReport, useManagerReport } from "../hooks";
import { StatCard } from "../components/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
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
  const topCities = [...data.porCidade]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const topCostCenters = [...data.porCentroDeCusto]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const maxCity = Math.max(1, ...topCities.map((item) => Number(item.total)));
  const priorityStatuses = [
    "EM_APROVACAO",
    "EM_CORRECAO",
    "FINANCEIRO",
  ] as const;
  const priorityItems = priorityStatuses
    .map((status) => ({
      status,
      quantity:
        data.reembolsosStatus.find((item) => item.status === status)
          ?.quantidade ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Visão gerencial
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Resumo operacional</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(data.periodoDe)} — {formatDate(data.periodoAte)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/viagens"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Ver viagens <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Administração
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Dashboards
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Despesas no período"
          value={formatMoney(data.totalDespesas)}
          icon={<WalletCards className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Reembolsos"
          value={formatMoney(data.totalReembolsado)}
          icon={<Activity className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Valores pendentes"
          value={formatMoney(data.valoresPendentes)}
          hint="Acompanhar"
        />
        <StatCard
          label="Relatórios pendentes"
          value={data.relatoriosPendentes}
          hint="Em aprovação"
        />
        <StatCard
          label="Viagens"
          value={data.quantidadeViagens}
          icon={<Plane className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Cidades com despesas"
          value={data.porCidade.length}
          icon={<MapPin className="size-4" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleHelp className="size-4 text-warning" aria-hidden="true" />
            Atenção necessária
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorityItems.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {priorityItems.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <TripStatusBadge status={item.status} />
                  <span className="font-semibold tabular-nums">{item.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum fluxo exige atenção imediata.
            </p>
          )}
        </CardContent>
      </Card>

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
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              Despesas por colaborador
            </CardTitle>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {topCities.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                Principais cidades
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {topCities.map((item) => (
                <div key={item.cidade} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.cidade}</span>
                    <span className="font-medium text-muted-foreground">
                      {formatMoney(item.total)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-info"
                      style={{ width: `${(Number(item.total) / maxCity) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {topCostCenters.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                Centros de custo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {topCostCenters.map((item, index) => (
                <div
                  key={`${item.nome ?? "sem-centro"}-${index}`}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span>{item.nome ?? "Sem centro de custo"}</span>
                  <span className="font-medium text-muted-foreground">
                    {formatMoney(item.total)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {data.evolucaoTemporal.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução das despesas</CardTitle>
            <p className="text-xs text-muted-foreground">
              Acompanhe a variação dos valores ao longo do período selecionado.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.evolucaoTemporal.map((item) => (
              <div key={item.periodo} className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">{item.periodo}</p>
                <p className="mt-1 font-semibold">{formatMoney(item.total)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.reembolsosStatus.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Viagens por status</CardTitle>
            <p className="text-xs text-muted-foreground">
              Considera todas as viagens, sem filtro de período.
            </p>
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
