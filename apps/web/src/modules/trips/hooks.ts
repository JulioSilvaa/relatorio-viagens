"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTrip, getTrip, listTrips, type CreateTripInput } from "./api";

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
