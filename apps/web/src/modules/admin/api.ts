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

export interface CreditCardView {
  id: string;
  cardholderName: string;
  last4: string;
  brand: string | null;
  active: boolean;
}

export interface CreditCardInput {
  cardholderName: string;
  cardNumber: string;
  brand?: string | null;
}

export interface UpdateCreditCardInput {
  cardholderName: string;
  cardNumber?: string;
  brand?: string | null;
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

export async function updateUser(
  userId: string,
  input: RegisterUserInput,
): Promise<UserDirectoryEntry> {
  const data = await apiFetch<{ user: UserDirectoryEntry }>(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function updateUserStatus(
  userId: string,
  status: "ATIVO" | "INATIVO",
): Promise<UserDirectoryEntry> {
  const data = await apiFetch<{ user: UserDirectoryEntry }>(
    `/api/users/${userId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return data.user;
}

export async function listCreditCards(): Promise<CreditCardView[]> {
  const data = await apiFetch<{ cards: CreditCardView[] }>('/api/credit-cards');
  return data.cards;
}

export async function createCreditCard(input: CreditCardInput): Promise<CreditCardView> {
  const data = await apiFetch<{ card: CreditCardView }>('/api/credit-cards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.card;
}

export async function updateCreditCard(
  cardId: string,
  input: UpdateCreditCardInput,
): Promise<CreditCardView> {
  const data = await apiFetch<{ card: CreditCardView }>(`/api/credit-cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.card;
}

export async function updateCreditCardStatus(
  cardId: string,
  active: boolean,
): Promise<CreditCardView> {
  const data = await apiFetch<{ card: CreditCardView }>(
    `/api/credit-cards/${cardId}/status`,
    { method: 'PATCH', body: JSON.stringify({ active }) },
  );
  return data.card;
}