const CSRF_COOKIE = "vdr_csrf";

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  if (!cookie) return undefined;
  return cookie.split("=").slice(1).join("=").split(".")[0];
}

async function primeCsrfToken(): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  try {
    await fetch("/api/health", { credentials: "include", cache: "no-store" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  } catch {
    // segue sem token; o servidor decide
  }
  return getCsrfToken();
}

function clearCsrfCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CSRF_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

async function sendWithCsrf(
  path: string,
  init: RequestInit,
  headers: Headers,
): Promise<Response> {
  let token = getCsrfToken();
  if (token) headers.set("x-csrf-token", token);

  let response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const isMutatingRequest =
    init.method !== undefined && init.method.toUpperCase() !== "GET";

  if (response.status === 403 && isMutatingRequest) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.clone().json()) as ApiErrorBody)
      : undefined;
    if (body?.error?.code?.startsWith("CSRF_")) {
      clearCsrfCookie();
      token = await primeCsrfToken();
      if (token) {
        headers.set("x-csrf-token", token);
        response = await fetch(path, {
          ...init,
          headers,
          credentials: "include",
          cache: "no-store",
        });
      }
    }
  }

  return response;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") {
    headers.set("content-type", "application/json");
  }

  const response = await sendWithCsrf(path, init, headers);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json()) as ApiErrorBody & { data?: T })
    : undefined;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "ERRO_INESPERADO",
      body?.error?.message ?? "Não foi possível concluir a operação.",
      body?.error?.fields,
    );
  }

  return body?.data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}
