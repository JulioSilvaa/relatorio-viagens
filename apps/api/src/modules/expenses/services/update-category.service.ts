import type { AuditService } from '../../../modules/audit/audit.service.js';
import { categoryToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { UpdateCategoryDto } from '../schemas/expense.schema.js';
import type { ExpenseCategoryView } from '../expense.types.js';

export class UpdateCategoryService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, dto: UpdateCategoryDto, actorId: string): Promise<ExpenseCategoryView> {
    const previous = await this.expenses.findCategoryById(id);
    const category = await this.expenses.updateCategory(id, dto);

    for (const field of Object.keys(dto) as (keyof UpdateCategoryDto)[]) {
      const oldValue = field === 'name' ? previous?.name : String(previous?.ativa);
      const newValue = field === 'name' ? category.name : String(category.ativa);
      if (oldValue !== newValue) {
        await this.audit.record({
          userId: actorId,
          operation: 'ALTERAR',
          entityType: 'CATEGORIA_DESPESA',
          entityId: id,
          field,
          oldValue,
          newValue,
        });
      }
    }

    return categoryToView(category);
  }
}
