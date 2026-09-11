import type { TripStatus } from '@prisma/client';
import type { ReceiptInsertData } from '../../receipts/receipt.types.js';

export interface ExpenseCategoryRecord {
  id: string;
  code: string;
  name: string;
  ativa: boolean;
}

export interface ExpenseLimitRecord {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  valor: string;
}

export interface ExpenseRecord {
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

export interface ExpenseForMutationRecord {
  id: string;
  tripId: string;
  categoryId: string;
  createdById: string;
  reembolsavel: boolean;
  valor: string;
  dataDespesa: Date;
  justificativa: string;
  trip: {
    status: TripStatus;
    criadoPorId: string;
    kmInicial: string | null;
    kmFinal: string | null;
    taxaKm: string | null;
    deletadoEm: Date | null;
  };
}

export interface CreateExpenseWithReceiptsInput {
  tripId: string;
  categoryId: string;
  createdById: string;
  createdByName: string;
  valor: string;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  receipts: ReceiptInsertData[];
}

export interface CreatedExpenseWithReceipts {
  expense: ExpenseRecord;
  receipts: Array<{ id: string; fileName: string }>;
}

export interface ExpensesRepository {
  findCategoryById(id: string): Promise<ExpenseCategoryRecord | null>;
  findCategoryByCode(code: string): Promise<ExpenseCategoryRecord | null>;
  listCategories(includeInactive: boolean): Promise<ExpenseCategoryRecord[]>;
  createCategory(code: string, name: string): Promise<ExpenseCategoryRecord>;
  updateCategory(
    id: string,
    data: { name?: string; ativa?: boolean },
  ): Promise<ExpenseCategoryRecord>;
  getLimit(categoryId: string): Promise<ExpenseLimitRecord | null>;
  listLimits(): Promise<ExpenseLimitRecord[]>;
  upsertLimit(categoryId: string, valor: string, updatedById: string): Promise<ExpenseLimitRecord>;
  createExpenseWithReceipts(
    input: CreateExpenseWithReceiptsInput,
  ): Promise<CreatedExpenseWithReceipts>;
  findById(id: string): Promise<ExpenseRecord | null>;
  listExpensesForTrip(tripId: string): Promise<ExpenseRecord[]>;
  findExpenseForMutation(id: string): Promise<ExpenseForMutationRecord | null>;
  updateExpense(id: string, data: Record<string, unknown>): Promise<ExpenseRecord>;
  softDeleteExpense(id: string, deletedById: string): Promise<void>;
}
