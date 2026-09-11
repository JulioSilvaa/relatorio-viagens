import { ApiError } from "@/lib/api";

export type ReportKind = "oficial" | "gerencial";

export async function downloadReport(
  tripId: string,
  kind: ReportKind,
  anexarComprovantes: boolean,
): Promise<void> {
  const query =
    kind === "oficial" && anexarComprovantes ? "?anexarComprovantes=1" : "";
  const response = await fetch(`/api/reports/trips/${tripId}/${kind}${query}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let code = "RELATORIO_DOWNLOAD";
    let message = "Não foi possível baixar o relatório.";
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // corpo não-JSON: mantém código e mensagem padrão
    }
    throw new ApiError(response.status, code, message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `relatorio-${kind}-${tripId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}