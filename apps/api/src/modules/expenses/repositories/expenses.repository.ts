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
    companyId: string;
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
  findCategoryById(id: string, companyId: string): Promise<ExpenseCategoryRecord | null>;
  findCategoryByCode(code: string, companyId: string): Promise<ExpenseCategoryRecord | null>;
  listCategories(includeInactive: boolean, companyId: string): Promise<ExpenseCategoryRecord[]>;
  createCategory(code: string, name: string, companyId: string): Promise<ExpenseCategoryRecord>;
  updateCategory(
    id: string,
    data: { name?: string; ativa?: boolean },
    companyId: string,
  ): Promise<ExpenseCategoryRecord>;
  getLimit(categoryId: string, companyId: string): Promise<ExpenseLimitRecord | null>;
  listLimits(companyId: string): Promise<ExpenseLimitRecord[]>;
  upsertLimit(
    categoryId: string,
    valor: string,
    updatedById: string,
    companyId: string,
  ): Promise<ExpenseLimitRecord>;
  createExpenseWithReceipts(
    input: CreateExpenseWithReceiptsInput,
  ): Promise<CreatedExpenseWithReceipts>;
  findById(id: string): Promise<ExpenseRecord | null>;
  listExpensesForTrip(tripId: string): Promise<ExpenseRecord[]>;
  findExpenseForMutation(id: string): Promise<ExpenseForMutationRecord | null>;
  updateExpense(id: string, data: Record<string, unknown>): Promise<ExpenseRecord>;
  softDeleteExpense(id: string, deletedById: string): Promise<void>;
}
