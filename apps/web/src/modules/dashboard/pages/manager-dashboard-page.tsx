"use client";

import { useState } from "react";
import {
  Filter,
  RotateCcw,
  TrendingUp,
  WalletCards,
  PieChart as PieChartIcon,
  BarChart3,
  Banknote,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSession } from "@/modules/auth/session-context";
import { useManagerReport } from "../hooks";
import { StatCard } from "../components/stat-card";
import { TripStatusBadge } from "@/modules/trips/components/trip-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { getErrorMessage } from "@/lib/api";
import type { DashboardManagerReport } from "@/types/domain";

const DEPARTAMENTOS = {
  COMERCIAL: "Comercial",
  TECNICO: "Técnico",
} as const;

const CHARTS_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function compactMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | string; name: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
      {label ? (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      ) : null}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">
            {entry.dataKey === "quantidade"
              ? String(entry.value)
              : formatMoney(String(entry.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function EvolutionChart({
  data,
}: {
  data: DashboardManagerReport["evolucaoTemporal"];
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        emoji="📈"
        title="Sem despesas no período"
        description="Ajuste os filtros para visualizar a evolução."
      />
    );
  }
  const rows = data.map((item) => ({ ...item, total: Number(item.total) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--muted)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => compactMoney(value)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<MoneyTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            name="Despesas"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#expenseFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryChart({
  data,
}: {
  data: DashboardManagerReport["porCategoria"];
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="Sem categorias no período"
        description="Ajuste os filtros para visualizar as categorias."
      />
    );
  }
  const rows = [...data]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 6)
    .map((item) => ({
      name: item.categoria?.name ?? "Outros",
      total: Number(item.total),
    }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--muted)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-12}
            height={52}
          />
          <YAxis
            tickFormatter={(value: number) => compactMoney(value)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]}>
            {rows.map((_, index) => (
              <Cell key={_.name} fill={CHARTS_PALETTE[index % CHARTS_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusChart({
  data,
}: {
  data: DashboardManagerReport["reembolsosStatus"];
}) {
  const rows = data
    .filter((item) => item.quantidade > 0)
    .map((item) => ({ ...item, fill: "transparent" }));
  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="🗺️"
        title="Sem viagens"
        description="Nenhuma viagem registrada ainda."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="quantidade"
              nameKey="status"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={3}
              strokeWidth={0}
            >
              {rows.map((entry, index) => (
                <Cell key={entry.status} fill={CHARTS_PALETTE[index % CHARTS_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((item, index) => (
          <li key={item.status} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CHARTS_PALETTE[index % CHARTS_PALETTE.length] }}
                aria-hidden="true"
              />
              <TripStatusBadge status={item.status} />
            </span>
            <span className="font-semibold tabular-nums text-muted-foreground">
              {item.quantidade}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DepartmentChart({
  data,
}: {
  data: DashboardManagerReport["viagensPorDepartamento"];
}) {
  const labels: Record<string, string> = {
    COMERCIAL: "Comercial",
    TECNICO: "Técnico",
  };
  const rows = data.map((item) => ({
    name: labels[item.departamento] ?? item.departamento,
    quantidade: item.quantidade,
  }));
  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="🏢"
        title="Sem viagens no período"
        description="Ajuste os filtros para visualizar o segmento."
      />
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--muted)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="quantidade" name="Viagens" radius={[0, 6, 6, 0]}>
            <Cell fill="var(--chart-1)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RegionChart({ data }: { data: DashboardManagerReport["viagensPorRegiao"] }) {
  const rows = data.filter((item) => item.quantidade > 0);
  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="🗺️"
        title="Sem viagens"
        description="Nenhuma viagem registrada ainda."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="quantidade"
              nameKey="regiao"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
              strokeWidth={0}
            >
              {rows.map((entry, index) => (
                <Cell
                  key={entry.regiao}
                  fill={CHARTS_PALETTE[index % CHARTS_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((item, index) => (
          <li key={item.regiao} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CHARTS_PALETTE[index % CHARTS_PALETTE.length] }}
                aria-hidden="true"
              />
              <span className="truncate text-foreground">{item.regiao}</span>
            </span>
            <span className="font-semibold tabular-nums text-muted-foreground">
              {item.quantidade}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TripsByContributorChart({
  data,
}: {
  data: DashboardManagerReport["viagensPorColaborador"];
}) {
  const top = [...data].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  if (top.length === 0) {
    return (
      <EmptyState
        emoji="👤"
        title="Sem viagens"
        description="Nenhuma viagem registrada ainda."
      />
    );
  }
  const rows = top.map((item) => ({ name: item.nome, quantidade: item.quantidade }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--muted)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="quantidade" name="Viagens" radius={[0, 6, 6, 0]}>
            <Cell fill="var(--chart-2)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CitiesChart({ data }: { data: DashboardManagerReport["cidadesMaisVisitadas"] }) {
  const top = [...data].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  if (top.length === 0) {
    return (
      <EmptyState
        emoji="📍"
        title="Sem viagens"
        description="Nenhuma viagem registrada ainda."
      />
    );
  }
  const rows = top.map((item) => ({
    name: `${item.cidade} (${item.uf})`,
    quantidade: item.quantidade,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--muted)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="quantidade" name="Visitas" radius={[0, 6, 6, 0]}>
            <Cell fill="var(--chart-3)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AdvanceSummary({
  data,
}: {
  data: DashboardManagerReport["adiantamentos"];
}) {
  const values = [
    { label: "Solicitado", total: Number(data.totalSolicitado), color: "var(--chart-4)" },
    { label: "Aprovado", total: Number(data.totalAprovado), color: "var(--chart-2)" },
    { label: "Pago", total: Number(data.totalPago), color: "var(--chart-1)" },
  ];
  const max = Math.max(1, ...values.map((item) => item.total));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        {values.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{item.label}</span>
              <span className="font-medium text-muted-foreground tabular-nums">
                {formatMoney(String(item.total.toFixed?.(2) ?? item.total))}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(item.total / max) * 100}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-center gap-1 rounded-xl bg-muted/40 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Aguardando análise
        </p>
        <p className="text-3xl font-bold tabular-nums">{data.pendentesAnalise}</p>
      </div>
    </div>
  );
}

function ContributorList({ data }: { data: DashboardManagerReport["porColaborador"] }) {
  const top = [...data].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 5);
  const max = Math.max(1, ...top.map((item) => Number(item.total)));
  return (
    <div className="flex flex-col gap-3">
      {top.map((colaborador) => (
        <div key={colaborador.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{colaborador.nome}</span>
            <span className="font-medium text-muted-foreground tabular-nums">
              {formatMoney(colaborador.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-secondary-foreground/60"
              style={{ width: `${(Number(colaborador.total) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; total: string }>;
}) {
  const max = Math.max(1, ...items.map((item) => Number(item.total)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="font-medium text-muted-foreground tabular-nums">
              {formatMoney(item.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${(Number(item.total) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <ChartSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const { user, status } = useSession();
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [departamento, setDepartamento] = useState("");
  const hasFilters = dataDe !== "" || dataAte !== "" || departamento !== "";
  const isManager = user?.roleCode === "MANAGER_ADMIN";
  const isPending = status === "loading";

  const { data, isLoading, isError, error, refetch } = useManagerReport(
    {
      dataDe: dataDe || undefined,
      dataAte: dataAte || undefined,
      departamento: departamento || undefined,
    },
    isManager && !isPending,
  );

  function clearFilters() {
    setDataDe("");
    setDataAte("");
    setDepartamento("");
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <PageSkeleton />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Dashboards</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <PageSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Visão gerencial
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(data.periodoDe)} — {formatDate(data.periodoAte)}
          </p>
        </div>
        {hasFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            <RotateCcw aria-hidden="true" />
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dashboard-de">De</Label>
            <Input
              id="dashboard-de"
              type="date"
              value={dataDe}
              onChange={(event) => setDataDe(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dashboard-ate">Até</Label>
            <Input
              id="dashboard-ate"
              type="date"
              value={dataAte}
              onChange={(event) => setDataAte(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dashboard-departamento">Departamento</Label>
            <Select
              value={departamento}
              onValueChange={(value) => setDepartamento(value === "" ? "" : value)}
            >
              <SelectTrigger id="dashboard-departamento" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(DEPARTAMENTOS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Despesas no período"
          value={formatMoney(data.totalDespesas)}
          icon={<WalletCards className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Reembolsos"
          value={formatMoney(data.totalReembolsado)}
          icon={<TrendingUp className="size-4" aria-hidden="true" />}
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
          icon={<BarChart3 className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Cidades com despesas"
          value={data.porCidade.length}
          icon={<PieChartIcon className="size-4" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
            Evolução das despesas
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Variação mensal do total de despesas no período selecionado.
          </p>
        </CardHeader>
        <CardContent>
          <EvolutionChart data={data.evolucaoTemporal} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
              Despesas por categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={data.porCategoria} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              Viagens por status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart data={data.reembolsosStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
            Viagens — análise por segmento
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Distribuição das viagens por departamento, região e colaborador no período.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Técnica ou comercial
            </h3>
            <DepartmentChart data={data.viagensPorDepartamento} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Regiões mais visitadas
            </h3>
            <RegionChart data={data.viagensPorRegiao} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Viagens por colaborador
            </h3>
            <TripsByContributorChart data={data.viagensPorColaborador} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />
            Adiantamentos
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pago representa o valor já pago; aprovado inclui pendências de pagamento.
          </p>
        </CardHeader>
        <CardContent>
          <AdvanceSummary data={data.adiantamentos} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
              Despesas por colaborador
            </CardTitle>
            <p className="text-xs text-muted-foreground">Top 5 no período selecionado.</p>
          </CardHeader>
          <CardContent>
            {data.porColaborador.length > 0 ? (
              <ContributorList data={data.porColaborador} />
            ) : (
              <EmptyState
                emoji="👤"
                title="Sem despesas no período"
                description="Ajuste os filtros para visualizar os colaboradores."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              Cidades mais visitadas
            </CardTitle>
            <p className="text-xs text-muted-foreground">Top 5 por número de viagens.</p>
          </CardHeader>
          <CardContent>
            <CitiesChart data={data.cidadesMaisVisitadas} />
          </CardContent>
        </Card>
      </div>

      {data.porCentroDeCusto.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
              Centros de custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.porCentroDeCusto.map((item) => ({
                label: item.nome ?? "Sem centro de custo",
                total: item.total,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}