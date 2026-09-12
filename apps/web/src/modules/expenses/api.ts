import { apiFetch } from "@/lib/api";
import type {
  ExpenseCategoryView,
  ReceiptTypeValue,
  TripExpenseView,
} from "@/types/domain";
import type { OcrPreviewItem } from "@/modules/ocr/api";

export interface CreateExpenseInput {
  tripId: string;
  categoryCode: string;
  valor: number | null;
  dataDespesa: string;
  reembolsavel: boolean;
  justificativa: string;
  tipoComprovante: ReceiptTypeValue;
}

export interface OcrPreviewResult {
  status: "SUCESSO" | "FALHA";
  erro?: string;
  data?: {
    textoOriginal?: string;
    erro?: string;
    tipoDocumento?: string;
    tipoDocumentoConfianca?: "alta" | "media" | "baixa";
    cnpj?: string;
    chaveAcesso?: string;
    numeroDocumento?: string;
    nomeEstabelecimento?: string;
    nomeFantasia?: string;
    data?: string;
    hora?: string;
    valorTotal?: string;
    valorProdutos?: string;
    desconto?: string;
    tributos?: string;
    acrescimos?: string;
    valorPago?: string;
    troco?: string;
    serie?: string;
    numeroSat?: string;
    qrCode?: string;
    inscricaoEstadual?: string;
    emitente?: string;
    destinatario?: string;
    formaPagamento?: string;
    protocoloAutorizacao?: string;
    endereco?: string;
    cidadeUf?: string;
    subtotal?: string;
    ncm?: string;
    cfop?: string;
    cstCsosn?: string;
    icms?: string;
    pis?: string;
    cofins?: string;
    observacoes?: string;
    informacoesComplementares?: string;
    camposExtras?: Array<{ secao?: string | null; label: string; valor?: string | null; confianca?: "alta" | "media" | "baixa" | null }>;
    itens?: OcrPreviewItem[];
    confiancaExtracao?: "alta" | "media" | "baixa";
    alertaReconciliacao?: boolean;
  };
}

export async function preAnalyzeReceipt(file: File): Promise<OcrPreviewResult> {
  const formData = new FormData();
  formData.set("comprovante", file);
  return apiFetch<OcrPreviewResult>("/api/ocr/pre-analisar", {
    method: "POST",
    body: formData,
  });
}

export async function listExpenseCategories(): Promise<ExpenseCategoryView[]> {
  const data = await apiFetch<{ categories: ExpenseCategoryView[] }>(
    "/api/expenses-categories",
  );
  return data.categories;
}

export async function createExpense(
  input: CreateExpenseInput,
  files: File[],
): Promise<TripExpenseView> {
  const formData = new FormData();
  formData.set("tripId", input.tripId);
  formData.set("categoryCode", input.categoryCode);
  formData.set("valor", input.valor === null ? "0" : String(input.valor));
  formData.set("dataDespesa", input.dataDespesa);
  formData.set("reembolsavel", String(input.reembolsavel));
  formData.set("justificativa", input.justificativa);
  formData.set("tipoComprovante", input.tipoComprovante);
  if (files[0]) formData.set("comprovante", files[0]);

  const data = await apiFetch<{ expense: TripExpenseView }>("/api/expenses", {
    method: "POST",
    body: formData,
  });
  return data.expense;
}

export async function changeReimbursability(
  expenseId: string,
  reembolsavel: boolean,
  justificativa: string,
): Promise<boolean> {
  const data = await apiFetch<{ reembolsavel: boolean }>(
    `/api/approvals/expenses/${expenseId}/reembolsabilidade`,
    {
      method: "PATCH",
      body: JSON.stringify({ reembolsavel, justificativa }),
    },
  );
  return data.reembolsavel;
}

export async function updateExpense(
  expenseId: string,
  input: { justificativa: string },
): Promise<TripExpenseView> {
  const data = await apiFetch<{ expense: TripExpenseView }>(
    `/api/expenses/${expenseId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data.expense;
}

export function receiptFileUrl(receiptId: string): string {
  return `/api/receipts/${receiptId}/arquivo`;
}