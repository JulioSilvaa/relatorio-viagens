import type { ReceiptType } from '@prisma/client';

export interface CreateExpenseData {
  tripId: string;
  categoryCode: string;
  valor: string;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  tipoComprovante: ReceiptType;
}

export interface ExpenseView {
  id: string;
  tripId: string;
  category: { id: string; code: string; name: string };
  valor: string;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  criadoPor: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategoryView {
  id: string;
  code: string;
  name: string;
  ativa: boolean;
}

export interface ExpenseLimitView {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  valor: string;
}
