import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import {
  AdvanceAmountExceedsRequestedError,
  AdvanceInvalidStatusError,
  AdvanceNotFoundError,
} from '../finance.errors.js';
import type { FinanceRepository, TripAdvanceRecord } from '../finance.types.js';
import { toCents } from '../finance.utils.js';

export class ReviewAdvanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    advanceId: string,
    input: { aprovado: boolean; valorAprovado: string | null; justificativaAnalise: string },
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<TripAdvanceRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const advance = await this.finance.findAdvanceById(advanceId);
    if (!advance) {
      throw new AdvanceNotFoundError();
    }
    const trip = await this.trips.findById(advance.tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }
    if (advance.status !== 'SOLICITADO' && advance.status !== 'EM_ANALISE') {
      throw new AdvanceInvalidStatusError();
    }
    if (input.aprovado) {
      if (input.valorAprovado === null) {
        throw new AdvanceInvalidStatusError();
      }
      if (toCents(input.valorAprovado) > toCents(advance.valorSolicitado)) {
        throw new AdvanceAmountExceedsRequestedError();
      }
    }

    const valorAprovado = input.aprovado ? (toCents(input.valorAprovado!) / 100).toFixed(2) : null;

    const updated = await this.finance.analyzeAdvance({
      advanceId,
      aprovado: input.aprovado,
      valorAprovado,
      justificativaAnalise: input.justificativaAnalise,
      aprovadoPorId: actorId,
      aprovadoEm: new Date(),
    });

    await this.audit.record({
      userId: actorId,
      operation: 'ADIANTAMENTO.ANALISAR',
      entityType: 'VIAGEM',
      entityId: advance.tripId,
      field: 'adiantamento',
      oldValue: 'SOLICITADO',
      newValue: updated.status,
      justification: input.justificativaAnalise || undefined,
    });

    const participants = await this.trips.listParticipantIds(advance.tripId);
    if (participants.length > 0) {
      await this.notifier.notifyMany({
        event: input.aprovado ? 'ADIANTAMENTO_APROVADO' : 'ADIANTAMENTO_RECUSADO',
        message: input.aprovado
          ? `Adiantamento de R$ ${valorAprovado} aprovado para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`
          : `Adiantamento recusado para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        detail: input.justificativaAnalise.trim() || undefined,
        tripId: advance.tripId,
        userIds: participants,
      });
    }

    return updated;
  }
}
