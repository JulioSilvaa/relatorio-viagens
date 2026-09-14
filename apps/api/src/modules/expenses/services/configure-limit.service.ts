import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { ExpenseCategoryNotFoundForConfigError } from '../expense.errors.js';
import { limitToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseLimitView } from '../expense.types.js';

export class ConfigureLimitService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    categoryId: string,
    valor: string,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<ExpenseLimitView> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const category = await this.expenses.findCategoryById(categoryId, actorCompanyId);
    if (!category) {
      throw new ExpenseCategoryNotFoundForConfigError();
    }

    const previous = await this.expenses.getLimit(categoryId, actorCompanyId);
    const limit = await this.expenses.upsertLimit(categoryId, valor, actorId, actorCompanyId);

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
