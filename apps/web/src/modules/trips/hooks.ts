"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveTrip,
  createTrip,
  deliverTrip,
  getTrip,
  listTrips,
  returnTrip,
  type CreateTripInput,
} from "./api";

export const tripsKeys = {
  all: ["trips"] as const,
  detail: (tripId: string) => ["trips", tripId] as const,
};

export function useTrips() {
  return useQuery({ queryKey: tripsKeys.all, queryFn: listTrips });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripsKeys.detail(tripId),
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => createTrip(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.all });
    },
  });
}

export function useDeliverTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deliverTrip(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function useApproveTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => approveTrip(tripId),
    onSuccess: (_data, tripId) => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReturnTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, justificativa }: { tripId: string; justificativa: string }) =>
      returnTrip(tripId, justificativa),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
