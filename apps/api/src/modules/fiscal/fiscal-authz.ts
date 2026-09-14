import { ExpenseNotFoundError } from '../expenses/expense.errors.js';
import type { ExpensesRepository } from '../expenses/repositories/expenses.repository.js';
import type { TripsRepository } from '../trips/repositories/trips.repository.js';
import { FiscalForbiddenError } from './fiscal.errors.js';

export interface ExpenseAccessContext {
  expenseId: string;
  tripId: string;
  createdById: string;
}

export async function authorizeExpenseAccess(
  expenses: ExpensesRepository,
  trips: TripsRepository,
  expenseId: string,
  actorId: string,
  canManageFiscal: boolean,
  actorCompanyId: string | null,
): Promise<ExpenseAccessContext> {
  const expense = await expenses.findById(expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }

  const trip = await trips.findById(expense.tripId);
  if (!trip || trip.companyId !== actorCompanyId) {
    throw new ExpenseNotFoundError();
  }

  const isAuthor = expense.criadoPor.id === actorId;
  const isParticipant = await trips.participantExists(expense.tripId, actorId);
  if (!isAuthor && !isParticipant && !canManageFiscal) {
    throw new FiscalForbiddenError();
  }

  return {
    expenseId: expense.id,
    tripId: expense.tripId,
    createdById: expense.criadoPor.id,
  };
}
