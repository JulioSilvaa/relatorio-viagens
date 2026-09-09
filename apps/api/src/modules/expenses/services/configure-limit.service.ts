import type { AuditService } from '../../../modules/audit/audit.service.js';
import { ExpenseCategoryNotFoundForConfigError } from '../expense.errors.js';
import { limitToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseLimitView } from '../expense.types.js';

export class ConfigureLimitService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(categoryId: string, valor: string, actorId: string): Promise<ExpenseLimitView> {
    const category = await this.expenses.findCategoryById(categoryId);
    if (!category) {
      throw new ExpenseCategoryNotFoundForConfigError();
    }

    const previous = await this.expenses.getLimit(categoryId);
    const limit = await this.expenses.upsertLimit(categoryId, valor, actorId);

    await this.audit.record({
      userId: actorId,
      operation: 'ALTERAR',
      entityType: 'LIMITE_CATEGORIA',
      entityId: categoryId,
      field: 'valor',
      oldValue: previous?.valor,
      newValue: limit.valor,
    });

    return limitToView(limit);
  }
}
