import type { AuditService } from '../../../modules/audit/audit.service.js';
import { categoryToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { CreateCategoryDto } from '../schemas/expense.schema.js';
import type { ExpenseCategoryView } from '../expense.types.js';

export class CreateCategoryService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateCategoryDto, actorId: string): Promise<ExpenseCategoryView> {
    const category = await this.expenses.createCategory(dto.code, dto.name);

    await this.audit.record({
      userId: actorId,
      operation: 'CRIAR',
      entityType: 'CATEGORIA_DESPESA',
      entityId: category.id,
      newValue: `${category.code} · ${category.name}`,
    });

    return categoryToView(category);
  }
}
