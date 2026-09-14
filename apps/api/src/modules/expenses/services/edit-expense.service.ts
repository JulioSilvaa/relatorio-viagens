import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import {
  ExpenseCategoryInactiveError,
  ExpenseCategoryNotFoundError,
  ExpenseForbiddenEditError,
  ExpenseInvalidValueError,
  ExpenseKmDataMissingError,
  ExpenseNotFoundError,
  ExpenseTripNotEditableError,
} from '../expense.errors.js';
import { expenseToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { EditExpenseDto } from '../schemas/expense.schema.js';
import type { ExpenseView } from '../expense.types.js';
import { EDITABLE_TRIP_STATUSES } from '../../trips/trip.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';

export class EditExpenseService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    id: string,
    dto: EditExpenseDto,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<ExpenseView> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const expense = await this.expenses.findExpenseForMutation(id);
    if (!expense || expense.trip.deletadoEm || expense.trip.companyId !== actorCompanyId) {
      throw new ExpenseNotFoundError();
    }
    if (expense.createdById !== actorId) {
      throw new ExpenseForbiddenEditError();
    }
    if (!EDITABLE_TRIP_STATUSES.includes(expense.trip.status)) {
      throw new ExpenseTripNotEditableError();
    }
    const trip = await this.trips.findById(expense.tripId);

    let categoryId = expense.categoryId;
    if (dto.categoryCode !== undefined && dto.categoryCode !== null) {
      const category = await this.expenses.findCategoryByCode(
        dto.categoryCode,
        trip?.companyId ?? '',
      );
      if (!category) {
        throw new ExpenseCategoryNotFoundError();
      }
      if (!category.ativa) {
        throw new ExpenseCategoryInactiveError();
      }
      categoryId = category.id;
    }

    const data: Record<string, unknown> = {};
    if (dto.dataDespesa !== undefined) data.dataDespesa = dto.dataDespesa;
    if (dto.reembolsavel !== undefined) data.reembolsavel = dto.reembolsavel;
    if (dto.justificativa !== undefined) data.justificativa = dto.justificativa;

    const category = await this.expenses.findCategoryById(categoryId, trip?.companyId ?? '');
    const isKmCategory = category?.code === 'KM_RODADOS';

    let valor = expense.valor;
    if (dto.valor !== undefined) valor = dto.valor;
    if (isKmCategory) {
      if (!trip || !trip.kmInicial || !trip.kmFinal || !trip.taxaKm) {
        throw new ExpenseKmDataMissingError();
      }
      valor = ((Number(trip.kmFinal) - Number(trip.kmInicial)) * Number(trip.taxaKm)).toFixed(2);
    } else if (Number(valor) <= 0) {
      throw new ExpenseInvalidValueError();
    }

    data.valor = valor;

    if (categoryId !== expense.categoryId) {
      data.categoryId = categoryId;
    }

    const limit = await this.expenses.getLimit(categoryId, trip?.companyId ?? '');
    let alertaExcesso: string | null = null;
    if (limit && Number(valor) > Number(limit.valor)) {
      alertaExcesso = (Number(valor) - Number(limit.valor)).toFixed(2);
    }
    data.alertaExcesso = alertaExcesso;

    const updated = await this.expenses.updateExpense(id, data);

    const before: Record<string, string> = {
      valor: expense.valor,
      reembolsavel: String(expense.reembolsavel),
      justificativa: expense.justificativa,
      dataDespesa: expense.dataDespesa.toISOString(),
    };
    const after: Record<string, string> = {
      valor: updated.valor,
      reembolsavel: String(updated.reembolsavel),
      justificativa: updated.justificativa,
      dataDespesa: updated.dataDespesa.toISOString(),
    };

    for (const field of Object.keys(before)) {
      if (before[field] !== after[field]) {
        await this.audit.record({
          userId: actorId,
          operation: 'ALTERAR',
          entityType: 'DESPESA',
          entityId: id,
          field,
          oldValue: before[field],
          newValue: after[field],
        });
      }
    }

    return expenseToView(updated);
  }
}
