import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import {
  ExpenseForbiddenDeleteError,
  ExpenseNotFoundError,
  ExpenseNotDeletableError,
} from '../expense.errors.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';

export class DeleteExpenseService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, actorId: string, actorCompanyId: string | null): Promise<void> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const expense = await this.expenses.findExpenseForMutation(id);
    if (!expense || expense.trip.deletadoEm || expense.trip.companyId !== actorCompanyId) {
      throw new ExpenseNotFoundError();
    }
    if (expense.createdById !== actorId) {
      throw new ExpenseForbiddenDeleteError();
    }
    if (expense.trip.status !== 'EM_ANDAMENTO') {
      throw new ExpenseNotDeletableError();
    }

    await this.expenses.softDeleteExpense(id, actorId);

    await this.audit.record({
      userId: actorId,
      operation: 'EXCLUIR',
      entityType: 'DESPESA',
      entityId: id,
      oldValue: expense.valor,
    });
  }
}
