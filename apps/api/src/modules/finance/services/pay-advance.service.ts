import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import { AdvanceInvalidStatusError, AdvanceNotFoundError } from '../finance.errors.js';
import type { FinanceRepository, TripAdvanceRecord } from '../finance.types.js';

export class PayAdvanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    advanceId: string,
    input: { observacoesPagamento: string | null },
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<TripAdvanceRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const advance = await this.finance.findAdvanceById(advanceId);
    if (!advance) {
      throw new AdvanceNotFoundError();
    }
    if (advance.status !== 'APROVADO' && advance.status !== 'PAGAMENTO_PENDENTE') {
      throw new AdvanceInvalidStatusError();
    }

    const updated = await this.finance.payAdvance({
      advanceId,
      observacoesPagamento: input.observacoesPagamento,
      pagoPorId: actorId,
      pagoEm: new Date(),
    });

    const trip = await this.trips.findById(advance.tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }

    await this.audit.record({
      userId: actorId,
      operation: 'ADIANTAMENTO.PAGAR',
      entityType: 'VIAGEM',
      entityId: advance.tripId,
      field: 'adiantamento',
      oldValue: 'APROVADO',
      newValue: 'PAGO',
      justification: input.observacoesPagamento || undefined,
    });

    const participants = await this.trips.listParticipantIds(advance.tripId);
    if (participants.length > 0) {
      await this.notifier.notifyMany({
        event: 'ADIANTAMENTO_PAGO',
        message: `Adiantamento de R$ ${advance.valorAprovado ?? advance.valorSolicitado} pago para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        detail: input.observacoesPagamento?.trim() || undefined,
        tripId: advance.tripId,
        userIds: participants,
      });
    }

    return updated;
  }
}
