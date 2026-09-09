import { prisma } from '../../../config/database.js';
import type { FiscalValidationRecord, FiscalValidationRepository } from '../fiscal.types.js';

interface PrismaFiscalValidationRow {
  expenseId: string;
  status: string;
  motivo: string | null;
  validatedById: string | null;
  validatedBy: { id: string; name: string } | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const INCLUDE = { validatedBy: { select: { id: true, name: true } } } as const;

function toRecord(row: PrismaFiscalValidationRow): FiscalValidationRecord {
  return {
    expenseId: row.expenseId,
    status: row.status as FiscalValidationRecord['status'],
    motivo: row.motivo,
    validatedById: row.validatedById,
    validatedBy: row.validatedBy,
    validatedAt: row.validatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaFiscalValidationRepository implements FiscalValidationRepository {
  async findByExpense(expenseId: string): Promise<FiscalValidationRecord | null> {
    const row = await prisma.fiscalValidation.findUnique({
      where: { expenseId },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async upsert(
    expenseId: string,
    status: FiscalValidationRecord['status'],
    motivo: string | null,
    validatedById: string,
  ): Promise<FiscalValidationRecord> {
    const row = await prisma.fiscalValidation.upsert({
      where: { expenseId },
      update: { status, motivo, validatedById, validatedAt: new Date() },
      include: INCLUDE,
      create: { expenseId, status, motivo, validatedById, validatedAt: new Date() },
    });
    return toRecord(row);
  }
}
