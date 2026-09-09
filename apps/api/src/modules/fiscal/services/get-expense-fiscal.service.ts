import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeExpenseAccess } from '../fiscal-authz.js';
import type { FiscalValidationRecord, FiscalValidationRepository } from '../fiscal.types.js';

export class GetExpenseFiscalService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly trips: TripsRepository,
    private readonly fiscal: FiscalValidationRepository,
  ) {}

  async execute(
    expenseId: string,
    actorId: string,
    canManageFiscal: boolean,
  ): Promise<FiscalValidationRecord> {
    await authorizeExpenseAccess(this.expenses, this.trips, expenseId, actorId, canManageFiscal);
    const record = await this.fiscal.findByExpense(expenseId);
    return (
      record ?? {
        expenseId,
        status: 'PENDENTE',
        motivo: null,
        validatedById: null,
        validatedBy: null,
        validatedAt: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }
    );
  }
}
