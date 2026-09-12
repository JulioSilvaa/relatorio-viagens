"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripsKeys } from "../trips/hooks";
import type { CreateExpenseInput } from "./api";
import {
  changeReimbursability,
  createExpense,
  listExpenseCategories,
  updateExpense,
} from "./api";

export const categoriesKeys = {
  all: ["expense-categories"] as const,
} as const;

export function useExpenseCategories() {
  return useQuery({
    queryKey: categoriesKeys.all,
    queryFn: listExpenseCategories,
  });
}

export function useCreateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, files }: { input: CreateExpenseInput; files: File[] }) =>
      createExpense(input, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function useChangeReimbursability(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      reembolsavel,
      justificativa,
    }: {
      expenseId: string;
      reembolsavel: boolean;
      justificativa: string;
    }) => changeReimbursability(expenseId, reembolsavel, justificativa),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}

export function useUpdateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, justificativa }: { expenseId: string; justificativa: string }) =>
      updateExpense(expenseId, { justificativa }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsKeys.detail(tripId) });
    },
  });
}