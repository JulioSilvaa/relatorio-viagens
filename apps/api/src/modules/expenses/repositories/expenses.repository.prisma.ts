import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import {
  ExpenseCategoryExistsError,
  ExpenseCategoryNotFoundForConfigError,
} from '../expense.errors.js';
import type {
  CreateExpenseWithReceiptsInput,
  ExpenseCategoryRecord,
  ExpenseForMutationRecord,
  ExpenseLimitRecord,
  ExpenseRecord,
  ExpensesRepository,
} from './expenses.repository.js';

const EXPENSE_INCLUDE = {
  category: true,
  createdBy: { select: { id: true, name: true } },
} as const;

function toCategory(category: {
  id: string;
  code: string;
  name: string;
  ativa: boolean;
}): ExpenseCategoryRecord {
  return { id: category.id, code: category.code, name: category.name, ativa: category.ativa };
}

export function toExpense(expense: {
  id: string;
  tripId: string;
  valor: Prisma.Decimal;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; code: string; name: string };
  createdBy: { id: string; name: string };
}): ExpenseRecord {
  return {
    id: expense.id,
    tripId: expense.tripId,
    category: expense.category,
    valor: expense.valor.toString(),
    dataDespesa: expense.dataDespesa,
    reembolsavel: expense.reembolsavel,
    justificativa: expense.justificativa,
    alertaExcesso: expense.alertaExcesso ? expense.alertaExcesso.toString() : null,
    criadoPor: expense.createdBy,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export class PrismaExpensesRepository implements ExpensesRepository {
  async findCategoryById(id: string): Promise<ExpenseCategoryRecord | null> {
    const category = await prisma.expenseCategory.findUnique({ where: { id } });
    return category ? toCategory(category) : null;
  }

  async findCategoryByCode(code: string): Promise<ExpenseCategoryRecord | null> {
    const category = await prisma.expenseCategory.findUnique({ where: { code } });
    return category ? toCategory(category) : null;
  }

  async listCategories(includeInactive: boolean): Promise<ExpenseCategoryRecord[]> {
    const categories = await prisma.expenseCategory.findMany({
      where: includeInactive ? undefined : { ativa: true },
      orderBy: { name: 'asc' },
    });
    return categories.map(toCategory);
  }

  async createCategory(code: string, name: string): Promise<ExpenseCategoryRecord> {
    try {
      const category = await prisma.expenseCategory.create({ data: { code, name } });
      return toCategory(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ExpenseCategoryExistsError();
      }
      throw error;
    }
  }

  async updateCategory(
    id: string,
    data: { name?: string; ativa?: boolean },
  ): Promise<ExpenseCategoryRecord> {
    try {
      const category = await prisma.expenseCategory.update({ where: { id }, data });
      return toCategory(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ExpenseCategoryNotFoundForConfigError();
      }
      throw error;
    }
  }

  async getLimit(categoryId: string): Promise<ExpenseLimitRecord | null> {
    const limit = await prisma.expenseCategoryLimit.findUnique({
      where: { categoryId },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    if (!limit) return null;
    return {
      categoryId: limit.categoryId,
      categoryCode: limit.category.code,
      categoryName: limit.category.name,
      valor: limit.valor.toString(),
    };
  }

  async listLimits(): Promise<ExpenseLimitRecord[]> {
    const limits = await prisma.expenseCategoryLimit.findMany({
      include: { category: { select: { id: true, code: true, name: true } } },
      orderBy: { category: { name: 'asc' } },
    });
    return limits.map((limit) => ({
      categoryId: limit.categoryId,
      categoryCode: limit.category.code,
      categoryName: limit.category.name,
      valor: limit.valor.toString(),
    }));
  }

  async upsertLimit(
    categoryId: string,
    valor: string,
    updatedById: string,
  ): Promise<ExpenseLimitRecord> {
    const limit = await prisma.expenseCategoryLimit.upsert({
      where: { categoryId },
      update: { valor, updatedById },
      create: { categoryId, valor, updatedById },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    return {
      categoryId: limit.categoryId,
      categoryCode: limit.category.code,
      categoryName: limit.category.name,
      valor: limit.valor.toString(),
    };
  }

  async createExpenseWithReceipts(input: CreateExpenseWithReceiptsInput): Promise<ExpenseRecord> {
    const expenseId = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          tripId: input.tripId,
          categoryId: input.categoryId,
          createdById: input.createdById,
          valor: input.valor,
          dataDespesa: input.dataDespesa,
          reembolsavel: input.reembolsavel,
          justificativa: input.justificativa,
          alertaExcesso: input.alertaExcesso,
        },
      });
      await tx.receipt.createMany({
        data: input.receipts.map((receipt) => ({
          expenseId: created.id,
          fileData: receipt.fileData,
          fileType: receipt.fileType,
          fileName: receipt.fileName,
          fileSize: receipt.fileSize,
          fileHash: receipt.fileHash,
          tipo: receipt.tipo,
          uploadedById: receipt.uploadedById,
        })),
      });
      return created.id;
    });

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id: expenseId },
      include: EXPENSE_INCLUDE,
    });
    return toExpense(expense);
  }

  async findById(id: string): Promise<ExpenseRecord | null> {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: EXPENSE_INCLUDE,
    });
    return expense ? toExpense(expense) : null;
  }

  async listExpensesForTrip(tripId: string): Promise<ExpenseRecord[]> {
    const expenses = await prisma.expense.findMany({
      where: { tripId, deletedAt: null },
      include: EXPENSE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return expenses.map(toExpense);
  }

  async findExpenseForMutation(id: string): Promise<ExpenseForMutationRecord | null> {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        trip: {
          select: {
            status: true,
            criadoPorId: true,
            kmInicial: true,
            kmFinal: true,
            taxaKm: true,
            deletadoEm: true,
          },
        },
      },
    });
    if (!expense) return null;
    return {
      id: expense.id,
      tripId: expense.tripId,
      categoryId: expense.categoryId,
      createdById: expense.createdById,
      reembolsavel: expense.reembolsavel,
      valor: expense.valor.toString(),
      dataDespesa: expense.dataDespesa,
      justificativa: expense.justificativa,
      trip: {
        status: expense.trip.status,
        criadoPorId: expense.trip.criadoPorId,
        kmInicial: expense.trip.kmInicial ? expense.trip.kmInicial.toString() : null,
        kmFinal: expense.trip.kmFinal ? expense.trip.kmFinal.toString() : null,
        taxaKm: expense.trip.taxaKm ? expense.trip.taxaKm.toString() : null,
        deletadoEm: expense.trip.deletadoEm,
      },
    };
  }

  async updateExpense(id: string, data: Record<string, unknown>): Promise<ExpenseRecord> {
    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: EXPENSE_INCLUDE,
    });
    return toExpense(expense);
  }

  async softDeleteExpense(id: string, deletedById: string): Promise<void> {
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    });
  }
}
