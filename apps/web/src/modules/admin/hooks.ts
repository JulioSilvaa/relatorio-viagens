import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSettings,
  registerUser,
  saveSettings,
  updateUser,
  updateUserStatus,
} from "./api";
import type { RegisterUserInput } from "./api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings);
      toast.success("Parâmetros atualizados.");
    },
  });
}

export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterUserInput) => registerUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: RegisterUserInput }) =>
      updateUser(userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Funcionário atualizado.");
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ATIVO" | "INATIVO" }) =>
      updateUserStatus(userId, status),
    onSuccess: (_user, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(variables.status === "ATIVO" ? "Funcionário reativado." : "Funcionário desativado.");
    },
  });
}