"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsKeys } from "../trips/hooks";
import {
  payAdvance,
  requestAdvance,
  reviewAdvance,
  type RequestAdvanceInput,
  type ReviewAdvanceInput,
} from "./api";

export function useRequestAdvance(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestAdvanceInput) => requestAdvance(tripId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function useReviewAdvance(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewAdvanceInput & { advanceId: string }) =>
      reviewAdvance(input.advanceId, {
        aprovado: input.aprovado,
        valorAprovado: input.valorAprovado,
        justificativaAnalise: input.justificativaAnalise,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function usePayAdvance(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { advanceId: string; observacoesPagamento: string | null }) =>
      payAdvance(input.advanceId, { observacoesPagamento: input.observacoesPagamento }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}