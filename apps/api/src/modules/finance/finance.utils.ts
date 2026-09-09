import type { ExpenseRecord } from '../expenses/repositories/expenses.repository.js';

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function approvedTotalCents(
  expenses: Array<Pick<ExpenseRecord, 'valor' | 'reembolsavel'>>,
): number {
  return expenses
    .filter((expense) => expense.reembolsavel)
    .reduce((sum, expense) => sum + toCents(expense.valor), 0);
}
