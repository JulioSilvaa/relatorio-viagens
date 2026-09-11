"use client";

import {
  Activity,
  Banknote,
  Building2,
  CircleHelp,
  MapPin,
  Plane,
  Users,
  WalletCards,
} from "lucide-react";
import { StatCard } from "./stat-card";
import { TripStatusBadge } from "@/modules/trips/components/trip-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { DashboardManagerReport } from "@/types/domain";

function CategoryBars({
  items,
}: {
  items: DashboardManagerReport["porCategoria"];
}) {
  const max = Math.max(1, ...items.map((item) => Number(item.total)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const percentage = (Number(item.total) / max) * 100;
        return (
          <div key={item.categoria?.code ?? "outros"} className="flex flex-col gap-1">
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
    </div>
  );
}

function CityBars({
  items,
}: {
  items: DashboardManagerReport["porCidade"];
}) {
  const max = Math.max(1, ...items.map((item) => Number(item.total)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
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
              style={{ width: `${(Number(item.total) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManagerReportPanels({
  data,
}: {
  data: DashboardManagerReport;
}) {
  const topCategories = [...data.porCategoria]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const topCities = [...data.porCidade]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const topCostCenters = [...data.porCentroDeCusto]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);
  const priorityStatuses = ["EM_APROVACAO", "EM_CORRECAO", "FINANCEIRO"] as const;
  const priorityItems = priorityStatuses
    .map((status) => ({
      status,
      quantity:
        data.reembolsosStatus.find((item) => item.status === status)?.quantidade ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  return (
    <div className="flex flex-col gap-6">
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
            <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />
            Adiantamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Solicitado</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatMoney(data.adiantamentos.totalSolicitado)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Aprovado</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatMoney(data.adiantamentos.totalAprovado)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatMoney(data.adiantamentos.totalPago)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Aguardando análise</p>
            <p className="mt-1 font-semibold tabular-nums">
              {data.adiantamentos.pendentesAnalise}
            </p>
          </div>
        </CardContent>
      </Card>

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
        <CardContent>
          <CategoryBars items={topCategories} />
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
            <CardContent>
              <CityBars items={topCities} />
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
              <span key={item.status} className="inline-flex items-center gap-1.5">
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