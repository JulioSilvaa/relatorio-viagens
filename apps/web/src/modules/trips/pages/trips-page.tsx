"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useTrips } from "../hooks";
import { TripCard } from "../components/trip-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { getErrorMessage } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function TripsPage() {
  const { user } = useSession();
  const { data, isLoading, isError, error, refetch } = useTrips();
  const router = useRouter();
  const canCreate = user?.roleCode === "MANAGER_ADMIN";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Viagens</h1>
        {canCreate ? (
          <Button asChild>
            <Link href="/viagens/nova">
              <Plus aria-hidden="true" />
              Nova viagem
            </Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && (data?.length ?? 0) > 0 ? (
        <ul className="flex flex-col gap-3">
          {data?.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      ) : null}

      {!isLoading && !isError && (data?.length ?? 0) === 0 ? (
        <EmptyState
          emoji="🧭"
          title="Você ainda não possui viagens"
          description="Sua próxima viagem aparecerá aqui."
          actionLabel="Criar viagem"
          onAction={() => {
            void router.push("/viagens/nova");
          }}
        />
      ) : null}
    </div>
  );
}
