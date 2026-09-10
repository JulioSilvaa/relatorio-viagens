import { apiFetch } from "@/lib/api";
import type { UserDirectoryEntry } from "@/modules/trips/api";

export interface SystemSettings {
  kmReimbursementRate: string;
}

export interface RegisterUserInput {
  name: string;
  email: string;
  phone?: string | null;
  department: "COMERCIAL" | "TECNICO";
  cargo: string;
  roleCode: "EMPLOYEE" | "MANAGER_ADMIN" | "FINANCE" | "FISCAL";
  managerId?: string | null;
}

export interface RegisterUserResult {
  user: UserDirectoryEntry;
  inviteToken?: string;
}

export async function getSettings(): Promise<SystemSettings> {
  const data = await apiFetch<{ settings: SystemSettings }>("/api/settings");
  return data.settings;
}

export async function saveSettings(
  input: { kmReimbursementRate: number },
): Promise<SystemSettings> {
  const data = await apiFetch<{ settings: SystemSettings }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.settings;
}

export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const data = await apiFetch<{ user: UserDirectoryEntry; inviteToken?: string }>(
    "/api/users",
    { method: "POST", body: JSON.stringify(input) },
  );
  return data;
}