import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import { FinanceForbiddenError } from '../finance.errors.js';
import type { FinanceRepository, TripFinanceData } from '../finance.types.js';
import { approvedTotalCents, toCents } from '../finance.utils.js';

export interface FinanceView extends TripFinanceData {
  totalAprovado: string;
  totalAdiantamentos: string;
  totalReembolsado: string;
  valorAReembolsar: string;
  valorADevolver: string;
}

export class GetFinanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly finance: FinanceRepository,
  ) {}

  async execute(
    tripId: string,
    actorId: string,
    canManageFinance: boolean,
    isManager: boolean,
    actorCompanyId: string | null,
  ): Promise<FinanceView> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }

    const isParticipant = await this.trips.participantExists(tripId, actorId);
    if (!isParticipant && !canManageFinance && !isManager) {
      throw new FinanceForbiddenError();
    }

    const data = await this.finance.listByTrip(tripId);
    const expenses = await this.expenses.listExpensesForTrip(tripId);
    const aprovadoCents = approvedTotalCents(expenses);
    const adiantamentosCents = data.advances.reduce((sum, advance) => {
      if (advance.status !== 'APROVADO' && advance.status !== 'PAGO') {
        return sum;
      }
      return sum + toCents(advance.valorAprovado ?? advance.valorSolicitado);
    }, 0);
    const pagamentosCents = data.payments.reduce((sum, payment) => sum + toCents(payment.valor), 0);

    const valorAReembolsar = Math.max(0, aprovadoCents - pagamentosCents);
    const valorADevolver = Math.max(0, adiantamentosCents - aprovadoCents);

    return {
      ...data,
      totalAprovado: (aprovadoCents / 100).toFixed(2),
      totalAdiantamentos: (adiantamentosCents / 100).toFixed(2),
      totalReembolsado: (pagamentosCents / 100).toFixed(2),
      valorAReembolsar: (valorAReembolsar / 100).toFixed(2),
      valorADevolver: (valorADevolver / 100).toFixed(2),
    };
  }
}
