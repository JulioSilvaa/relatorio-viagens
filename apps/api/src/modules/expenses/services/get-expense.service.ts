import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { ExpenseNotFoundError } from '../expense.errors.js';
import { expenseToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { ExpenseView } from '../expense.types.js';

export class GetExpenseService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly trips: TripsRepository,
  ) {}

  async execute(
    id: string,
    actorId: string,
    canViewAny: boolean,
    actorCompanyId: string | null,
  ): Promise<ExpenseView> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const expense = await this.expenses.findById(id);
    if (!expense || !(await this.canView(expense.tripId, actorId, canViewAny, actorCompanyId))) {
      throw new ExpenseNotFoundError();
    }
    return expenseToView(expense);
  }

  private async canView(
    tripId: string,
    actorId: string,
    canViewAny: boolean,
    actorCompanyId: string,
  ): Promise<boolean> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.companyId !== actorCompanyId) return false;
    if (canViewAny) return true;
    return this.trips.participantExists(tripId, actorId);
  }
}
