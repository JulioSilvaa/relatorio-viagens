"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Paperclip, Users } from "lucide-react";
import Link from "next/link";
import { useTrip } from "../hooks";
import { TripStatusBadge } from "../components/trip-status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatMoney, formatPeriodo } from "@/lib/format";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const totalDespesas = trip.despesas.reduce(
    (acc, despesa) => acc + Number(despesa.valor),
    0,
  );
  const totalComprovantes = trip.despesas.reduce(
    (acc, despesa) => acc + despesa.receipts.length,
    0,
  );
  const reembolsavel = trip.despesas.some((despesa) => despesa.reembolsavel);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Voltar">
          <Link href="/viagens">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {trip.cliente}
        </h1>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <TripStatusBadge status={trip.status} />
            <span className="text-xs text-muted-foreground">
              #{trip.id.slice(0, 8)}
            </span>
          </div>
          <div>
            <p className="text-lg font-medium">
              {trip.cidade} - <span className="uppercase">{trip.uf}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
            </p>
            {trip.motivo ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.motivo}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold">{trip.participants.length}</p>
            <p className="text-xs text-muted-foreground">Participantes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <span className="text-sm text-muted-foreground">🎫</span>
            <p className="text-lg font-semibold">{trip.despesas.length}</p>
            <p className="text-xs text-muted-foreground">Despesas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <Paperclip
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold">{totalComprovantes}</p>
            <p className="text-xs text-muted-foreground">Comprovantes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-1 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Resumo
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatMoney(totalDespesas)}
          </p>
          <p className="text-xs text-muted-foreground">
            {reembolsavel
              ? "Inclui despesas reembolsáveis"
              : "Sem despesas reembolsáveis"}
          </p>
        </CardContent>
      </Card>

      {trip.observacoes ? (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Observações
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {trip.observacoes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section aria-label="Despesas">
        <CardHeader className="px-0 pb-2">
          <CardTitle className="text-base">Despesas</CardTitle>
        </CardHeader>
        {trip.despesas.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Nenhuma despesa registrada até o momento.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {trip.despesas.map((despesa) => (
              <li key={despesa.id}>
                <Card className="shadow-sm">
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {despesa.category?.name ?? "Sem categoria"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(despesa.dataDespesa)} ·{" "}
                        {despesa.criadoPor.name}
                      </p>
                      {despesa.receipts.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <Paperclip
                            className="mr-1 inline size-3"
                            aria-hidden="true"
                          />
                          {despesa.receipts.length} comprovante(s)
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatMoney(despesa.valor)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {trip.participants.length > 0 ? (
        <section aria-label="Participantes">
          <CardHeader className="px-0 pb-2">
            <CardTitle className="text-base">Participantes</CardTitle>
          </CardHeader>
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-2 p-4">
              {trip.participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-foreground">{participant.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Desde {formatDate(participant.addedAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
