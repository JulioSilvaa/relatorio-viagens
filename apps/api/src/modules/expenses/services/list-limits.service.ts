import { limitToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseLimitView } from '../expense.types.js';

export class ListLimitsService {
  constructor(private readonly expenses: ExpensesRepository) {}

  async execute(companyId: string | null): Promise<ExpenseLimitView[]> {
    if (!companyId) return [];
    const limits = await this.expenses.listLimits(companyId);
    return limits.map(limitToView);
  }
}
