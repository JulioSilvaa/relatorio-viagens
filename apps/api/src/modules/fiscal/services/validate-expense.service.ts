import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import { ExpenseNotFoundError } from '../../expenses/expense.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeExpenseAccess } from '../fiscal-authz.js';
import type { FiscalValidationRecord, FiscalValidationRepository } from '../fiscal.types.js';

export class ValidateExpenseService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly trips: TripsRepository,
    private readonly fiscal: FiscalValidationRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    expenseId: string,
    status: 'VALIDO' | 'PROBLEMA',
    motivo: string | null,
    actorId: string,
  ): Promise<FiscalValidationRecord> {
    const existing = await this.expenses.findById(expenseId);
    if (!existing) {
      throw new ExpenseNotFoundError();
    }
    await authorizeExpenseAccess(this.expenses, this.trips, expenseId, actorId, true);

    const previous = await this.fiscal.findByExpense(expenseId);
    const saved = await this.fiscal.upsert(expenseId, status, motivo, actorId);

    await this.audit.record({
      userId: actorId,
      operation: status === 'VALIDO' ? 'FISCAL.VALIDAR' : 'FISCAL.RECUSAR',
      entityType: 'DESPESA',
      entityId: expenseId,
      field: 'situacaoFiscal',
      oldValue: previous?.status ?? 'PENDENTE',
      newValue: status,
      justification: motivo ?? undefined,
    });

    if (status === 'PROBLEMA') {
      await this.notifier.notifyMany({
        event: 'PROBLEMA_FISCAL',
        message: `Problema fiscal na despesa: ${motivo}`,
        tripId: existing.tripId,
        userIds: [existing.criadoPor.id],
      });
    }

    return saved;
  }
}
