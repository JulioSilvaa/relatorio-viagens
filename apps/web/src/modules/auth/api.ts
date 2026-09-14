import { apiFetch } from "@/lib/api";
import type { UserView } from "@/types/domain";

export interface LoginResponse {
  user: UserView;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  companyName: string;
  cnpj: string;
}

export async function login(
  email: string,
  password: string,
): Promise<UserView> {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(input: RegisterInput): Promise<UserView> {
  const data = await apiFetch<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function fetchMe(): Promise<UserView> {
  const data = await apiFetch<{ user: UserView }>("/api/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export async function acceptInvite(token: string, password: string): Promise<void> {
  await apiFetch<void>("/api/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
