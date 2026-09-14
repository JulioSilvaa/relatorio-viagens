import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import {
  FinancePaymentValueMismatchError,
  FinanceTripNotReceivedError,
} from '../finance.errors.js';
import type { FinanceRepository, PaymentComprovante, TripPaymentRecord } from '../finance.types.js';
import { approvedTotalCents, toCents } from '../finance.utils.js';

export class RegisterPaymentService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    tripId: string,
    input: {
      valor: string;
      dataPagamento: Date;
      observacoes: string | null;
      comprovante: PaymentComprovante | null;
    },
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<TripPaymentRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }
    if (trip.status !== 'FINANCEIRO') {
      throw new FinanceTripNotReceivedError();
    }

    const expenses = await this.expenses.listExpensesForTrip(tripId);
    const approvedCents = approvedTotalCents(expenses);
    const inputCents = toCents(input.valor);
    if (inputCents !== approvedCents) {
      throw new FinancePaymentValueMismatchError();
    }

    const payment = await this.finance.registerPayment({
      tripId,
      valor: (approvedCents / 100).toFixed(2),
      dataPagamento: input.dataPagamento,
      observacoes: input.observacoes,
      responsavelId: actorId,
      comprovante: input.comprovante,
    });

    await this.trips.setStatus(tripId, 'FINALIZADA');

    await this.audit.record({
      userId: actorId,
      operation: 'PAGAMENTO.REGISTRAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: 'FINANCEIRO',
      newValue: 'FINALIZADA',
    });

    const participants = await this.trips.listParticipantIds(tripId);
    if (participants.length > 0) {
      await this.notifier.notifyMany({
        event: 'REEMBOLSO_PAGO',
        message: `Reembolso de R$ ${payment.valor} pago para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        detail: input.observacoes?.trim() || undefined,
        tripId,
        userIds: participants,
      });
    }

    return payment;
  }
}
