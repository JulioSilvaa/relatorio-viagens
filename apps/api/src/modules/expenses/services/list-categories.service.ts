import { categoryToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseCategoryView } from '../expense.types.js';

export class ListCategoriesService {
  constructor(private readonly expenses: ExpensesRepository) {}

  async execute(
    includeInactive: boolean,
    companyId: string | null,
  ): Promise<ExpenseCategoryView[]> {
    if (!companyId) return [];
    const categories = await this.expenses.listCategories(includeInactive, companyId);
    return categories.map(categoryToView);
  }
}
