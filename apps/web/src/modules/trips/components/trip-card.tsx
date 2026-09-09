"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTripStatusMeta } from "@/lib/trip-status";
import { formatPeriodo } from "@/lib/format";
import type { TripView } from "@/types/domain";
import { TripStatusBadge } from "./trip-status-badge";

export function TripCard({ trip }: { trip: TripView }) {
  const meta = getTripStatusMeta(trip.status);

  return (
    <Link
      href={`/viagens/${trip.id}`}
      className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="shadow-sm transition-colors hover:border-ring/40 hover:bg-card">
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-semibold text-foreground">
                {trip.cliente}
              </h3>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {trip.cidade} - <span className="uppercase">{trip.uf}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
            </p>
            {trip.criadoPor ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {trip.criadoPor.name}
              </p>
            ) : null}
            <p className="sr-only">{meta.label}</p>
          </div>
          <ChevronRight
            className="mt-1 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
