"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addParticipant,
  approveTrip,
  createTrip,
  deliverTrip,
  getTrip,
  listTrips,
  listUsers,
  removeParticipant,
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
    mutationFn: ({
      tripId,
      taxaKm,
    }: {
      tripId: string;
      taxaKm?: number | null;
    }) => approveTrip(tripId, { taxaKm }),
    onSuccess: (_data, { tripId }) => {
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

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled,
  });
}

export function useAddParticipant(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => addParticipant(tripId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function useRemoveParticipant(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeParticipant(tripId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}
