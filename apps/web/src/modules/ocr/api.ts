import { apiFetch } from "@/lib/api";

export interface ReceiptOcrRecord {
  receiptId: string;
  status: "PENDENTE" | "SUCESSO" | "FALHA";
  origem: "OCR" | "MANUAL";
  cnpj: string | null;
  nomeEstabelecimento: string | null;
  data: string | null;
  hora: string | null;
  valorTotal: string | null;
  numeroDocumento: string | null;
  chaveAcesso: string | null;
  itens: unknown[] | null;
  erro: string | null;
  extraidoEm: string | null;
  conferidoPor: { id: string; name: string } | null;
  conferidoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveReceiptOcrInput {
  cnpj?: string;
  nomeEstabelecimento?: string;
  data?: string;
  hora?: string;
  valorTotal?: number;
  numeroDocumento?: string;
  chaveAcesso?: string;
  itens?: unknown[];
  dadosOriginais?: Record<string, unknown>;
}

export function fetchReceiptOcr(receiptId: string): Promise<ReceiptOcrRecord> {
  return apiFetch<ReceiptOcrRecord>(`/api/ocr/receipts/${receiptId}`);
}

export function extractReceiptOcr(
  receiptId: string,
): Promise<ReceiptOcrRecord> {
  return apiFetch<ReceiptOcrRecord>(`/api/ocr/receipts/${receiptId}/extrair`, {
    method: "POST",
  });
}

export function saveReceiptOcr(
  receiptId: string,
  input: SaveReceiptOcrInput,
): Promise<ReceiptOcrRecord> {
  return apiFetch<ReceiptOcrRecord>(`/api/ocr/receipts/${receiptId}/dados`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
