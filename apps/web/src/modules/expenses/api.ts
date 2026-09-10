import { apiFetch } from "@/lib/api";
import type {
  ExpenseCategoryView,
  ReceiptTypeValue,
  TripExpenseView,
} from "@/types/domain";

export interface CreateExpenseInput {
  tripId: string;
  categoryCode: string;
  valor: number | null;
  dataDespesa: string;
  reembolsavel: boolean;
  justificativa: string;
  tipoComprovante: ReceiptTypeValue;
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
  for (const file of files) {
    formData.append("comprovantes", file);
  }

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

export function receiptFileUrl(receiptId: string): string {
  return `/api/receipts/${receiptId}/arquivo`;
}