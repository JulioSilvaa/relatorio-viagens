import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import {
  ChangeReimbursabilityExpenseNotFoundError,
  ReportJustificationRequiredError,
  ReportNotInApprovalError,
} from '../approval.errors.js';

export interface ChangeReimbursabilityInput {
  expenseId: string;
  reembolsavel: boolean;
  justificativa: string;
}

export class ChangeReimbursabilityService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ChangeReimbursabilityInput, actorId: string): Promise<boolean> {
    if (!input.justificativa || input.justificativa.trim().length < 3) {
      throw new ReportJustificationRequiredError();
    }

    const expense = await this.expenses.findExpenseForMutation(input.expenseId);
    if (!expense || expense.trip.deletadoEm) {
      throw new ChangeReimbursabilityExpenseNotFoundError();
    }
    if (expense.trip.status !== 'EM_APROVACAO') {
      throw new ReportNotInApprovalError();
    }

    await this.expenses.updateExpense(input.expenseId, {
      reembolsavel: input.reembolsavel,
    });

    await this.audit.record({
      userId: actorId,
      operation: 'ALTERAR_REEMBOLSABILIDADE',
      entityType: 'DESPESA',
      entityId: input.expenseId,
      field: 'reembolsavel',
      oldValue: String(expense.reembolsavel),
      newValue: String(input.reembolsavel),
      justification: input.justificativa.trim(),
    });

    return input.reembolsavel;
  }
}
