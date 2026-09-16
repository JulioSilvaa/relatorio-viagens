import type { APIRequestContext, BrowserContext } from "@playwright/test";

const API_URL = "http://localhost:3000";

/** Gera um CNPJ com dígitos verificadores válidos, único por chamada. */
export function randomCnpj(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const digit = (nums: number[], weights: number[]): number => {
    const sum = nums.reduce((acc, n, i) => acc + n * weights[i]!, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digit([...base, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...base, d1, d2].join("");
}

/** Registra uma empresa + usuário novos (a rota já autologa, definindo os cookies de sessão). */
export async function registerTestAccount(
  request: APIRequestContext,
): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.com`;
  const password = "senha-teste-123";
  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: {
      companyName: "Empresa E2E",
      cnpj: randomCnpj(),
      name: "Testador E2E",
      email,
      password,
    },
  });
  if (!res.ok()) {
    throw new Error(`Falha ao registrar conta de teste: ${res.status()} ${await res.text()}`);
  }
  return { email, password };
}

/** Lê o token CSRF do cookie `vdr_csrf` já presente no contexto do navegador. */
export async function readCsrfToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const csrfCookie = cookies.find((c) => c.name === "vdr_csrf");
  if (!csrfCookie) throw new Error("Cookie vdr_csrf não encontrado — usuário está logado?");
  return csrfCookie.value.split(".")[0]!;
}

/** Cria uma viagem via API usando a sessão já autenticada no contexto do navegador. */
export async function createTestTrip(
  request: APIRequestContext,
  context: BrowserContext,
): Promise<string> {
  const csrf = await readCsrfToken(context);
  const res = await request.post(`${API_URL}/api/trips`, {
    headers: { "x-csrf-token": csrf },
    data: {
      cliente: "Cliente E2E",
      cidade: "São Paulo",
      uf: "SP",
      dataSaida: "2026-09-10",
      dataRetorno: "2026-09-12",
      departamento: "COMERCIAL",
      motivo: "Viagem de teste automatizado (Playwright)",
    },
  });
  if (!res.ok()) {
    throw new Error(`Falha ao criar viagem de teste: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { trip: { id: string } } };
  return body.data.trip.id;
}
