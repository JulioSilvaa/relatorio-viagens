"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchMe, login as loginRequest, logout as logoutRequest, register as registerRequest } from "./api";
import { ApiError, getErrorMessage } from "@/lib/api";
import type { UserView } from "@/types/domain";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: UserView | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; companyName: string; cnpj: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_KEY = ["session"] as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const setUser = useCallback(
    (user: UserView | null) => {
      queryClient.setQueryData(SESSION_KEY, user);
    },
    [queryClient],
  );

  const status: SessionStatus = meQuery.isLoading
    ? "loading"
    : meQuery.data
      ? "authenticated"
      : "unauthenticated";

  const login = useCallback(
    async (email: string, password: string) => {
      const logged = await loginRequest(email, password);
      setUser(logged);
    },
    [setUser],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; companyName: string; cnpj: string }) => {
      const logged = await registerRequest(input);
      setUser(logged);
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Sem sessão no servidor também devemos limpar o estado local.
    }
    setUser(null);
    router.replace("/login");
  }, [router, setUser]);

  const value = useMemo(
    () => ({ status, user: meQuery.data ?? null, login, register, logout }),
    [status, meQuery.data, login, register, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de <SessionProvider>.");
  }
  return context;
}

export function sessionError(error: unknown): string {
  return getErrorMessage(error);
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
