"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Plus,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useTrips } from "../hooks";
import { TripStatusBadge } from "../components/trip-status-badge";
import { getTripStatusMeta } from "@/lib/trip-status";
import { formatPeriodo } from "@/lib/format";
import type { TripStatus, TripView } from "@/types/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { getErrorMessage } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

const PAGE_SIZE = 12;

const STATUS_ORDER: TripStatus[] = [
  "EM_ANDAMENTO",
  "EM_APROVACAO",
  "EM_CORRECAO",
  "APROVADA",
  "FINANCEIRO",
  "FINALIZADA",
  "CANCELADA",
];

function statusCounts(trips: TripView[]): Array<{ status: TripStatus; count: number }> {
  const counts = new Map<TripStatus, number>();
  for (const trip of trips) {
    counts.set(trip.status, (counts.get(trip.status) ?? 0) + 1);
  }
  return STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

function matchesSearch(trip: TripView, search: string): boolean {
  const haystack = [trip.cliente, trip.cidade, trip.uf, trip.motivo, trip.criadoPor?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function TripRow({ trip }: { trip: TripView }) {
  return (
    <Link
      href={`/viagens/${trip.id}`}
      className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{trip.cliente}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{trip.criadoPor?.name}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {trip.cidade} - <span className="uppercase">{trip.uf}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
          {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
        </p>
      </div>
      <p className="hidden truncate text-sm text-muted-foreground md:block">
        {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
      </p>
      <p className="hidden truncate text-xs text-muted-foreground md:block">
        {trip.departamento === "COMERCIAL" ? "Comercial" : "Técnico"}
      </p>
      <div className="flex items-center justify-end gap-2">
        <TripStatusBadge status={trip.status} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </Link>
  );
}

export default function TripsPage() {
  const { user } = useSession();
  const { data, isLoading, isError, error, refetch } = useTrips();
  const router = useRouter();
  const canCreate = user?.roleCode === "MANAGER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TripStatus>("ALL");
  const [page, setPage] = useState(0);

  const trips = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => statusCounts(trips), [trips]);

  const filtered = useMemo(() => {
    const term = search.trim();
    return trips.filter((trip) => {
      if (statusFilter !== "ALL" && trip.status !== statusFilter) return false;
      if (term !== "" && !matchesSearch(trip, term)) return false;
      return true;
    });
  }, [trips, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "ALL";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Viagens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus deslocamentos, despesas e aprovações em um só lugar.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/viagens/nova">
              <Plus aria-hidden="true" />
              Nova viagem
            </Link>
          </Button>
        ) : null}
      </div>

      {!isLoading && !isError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">Encontrar uma viagem</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </p>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar por cliente, cidade ou motivo..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="pl-9"
              aria-label="Buscar viagens"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filtrar por status">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setPage(0);
              }}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === "ALL"
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Todas ({trips.length})
            </button>
            {counts.map(({ status, count }) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter((current) => (current === status ? "ALL" : status));
                  setPage(0);
                }}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    getTripStatusMeta(status).dotClass,
                  )}
                  aria-hidden="true"
                />
                {getTripStatusMeta(status).label} ({count})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {hasActiveFilters ? (
              <span>
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span>{filtered.length} viagens cadastradas</span>
            )}
            {hasActiveFilters ? (
              <button
                type="button"
                className="cursor-pointer normal-case tracking-normal text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPage(0);
                }}
              >
                Limpar filtros
              </button>
            ) : (
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
            {visible.map((trip) => (
              <TripRow key={trip.id} trip={trip} />
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Página {safePage + 1} de {pageCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={safePage === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                >
                  Próxima
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <EmptyState
          icon={hasActiveFilters ? SearchX : Compass}
          title={
            hasActiveFilters
              ? "Nenhuma viagem encontrada"
              : "Você ainda não possui viagens"
          }
          description={
            hasActiveFilters
              ? "Ajuste a busca ou os filtros de status para encontrar as viagens."
              : "Sua próxima viagem aparecerá aqui."
          }
          actionLabel={hasActiveFilters ? undefined : "Criar viagem"}
          onAction={
            hasActiveFilters
              ? undefined
              : () => {
                void router.push("/viagens/nova");
              }
          }
        />
      ) : null}
    </div>
  );
}