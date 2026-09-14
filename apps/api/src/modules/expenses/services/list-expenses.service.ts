import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { ExpenseForbiddenError, ExpenseTripNotFoundError } from '../expense.errors.js';
import { expenseToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseView } from '../expense.types.js';

export class ListExpensesService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly expenses: ExpensesRepository,
  ) {}

  async execute(
    tripId: string | undefined,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<ExpenseView[]> {
    if (!actorCompanyId) throw new TenantRequiredError();
    if (!tripId) {
      throw new ExpenseTripNotFoundError();
    }
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new ExpenseTripNotFoundError();
    }
    const isParticipant = await this.trips.participantExists(tripId, actorId);
    if (!isParticipant) {
      throw new ExpenseForbiddenError();
    }
    const expenses = await this.expenses.listExpensesForTrip(tripId);
    return expenses.map(expenseToView);
  }
}
