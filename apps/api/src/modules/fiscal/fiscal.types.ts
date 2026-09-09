import type { FiscalValidationStatus } from '@prisma/client';

export interface FiscalValidationRecord {
  expenseId: string;
  status: FiscalValidationStatus;
  motivo: string | null;
  validatedById: string | null;
  validatedBy: { id: string; name: string } | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalValidationRepository {
  findByExpense(expenseId: string): Promise<FiscalValidationRecord | null>;
  upsert(
    expenseId: string,
    status: FiscalValidationStatus,
    motivo: string | null,
    validatedById: string,
  ): Promise<FiscalValidationRecord>;
}
