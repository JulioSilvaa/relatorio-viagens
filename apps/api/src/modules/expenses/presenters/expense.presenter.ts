import type {
  ExpenseCategoryRecord,
  ExpenseLimitRecord,
  ExpenseRecord,
} from '../repositories/expenses.repository.js';
import type { ExpenseCategoryView, ExpenseLimitView, ExpenseView } from '../expense.types.js';

export function expenseToView(expense: ExpenseRecord): ExpenseView {
  return {
    id: expense.id,
    tripId: expense.tripId,
    category: expense.category,
    valor: expense.valor,
    dataDespesa: expense.dataDespesa,
    reembolsavel: expense.reembolsavel,
    justificativa: expense.justificativa,
    alertaExcesso: expense.alertaExcesso,
    criadoPor: expense.criadoPor,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export function categoryToView(category: ExpenseCategoryRecord): ExpenseCategoryView {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    ativa: category.ativa,
  };
}

export function limitToView(limit: ExpenseLimitRecord): ExpenseLimitView {
  return {
    categoryId: limit.categoryId,
    categoryCode: limit.categoryCode,
    categoryName: limit.categoryName,
    valor: limit.valor,
  };
}
