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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const isMutating =
    init.method !== undefined && init.method.toUpperCase() !== "GET";

  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") {
    headers.set("content-type", "application/json");
  }
  if (isMutating) {
    const token = getCsrfToken();
    if (token) {
      headers.set("x-csrf-token", token);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

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
