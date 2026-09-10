import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import { AdvanceAlreadyRequestedError } from '../finance.errors.js';
import type { FinanceRepository, TripAdvanceRecord } from '../finance.types.js';

export class RequestAdvanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    tripId: string,
    input: { valorSolicitado: string; justificativaSolicitacao: string },
    actorId: string,
  ): Promise<TripAdvanceRecord> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const current = await this.finance.findLatestAdvanceByTrip(tripId);
    if (current && current.status !== 'RECUSADO') {
      throw new AdvanceAlreadyRequestedError();
    }

    const advance = await this.finance.createAdvanceRequest({
      tripId,
      valorSolicitado: input.valorSolicitado,
      justificativaSolicitacao: input.justificativaSolicitacao,
      solicitadoPorId: actorId,
    });

    await this.audit.record({
      userId: actorId,
      operation: 'ADIANTAMENTO.SOLICITAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'adiantamento',
      oldValue: undefined,
      newValue: advance.valorSolicitado,
    });

    const participants = await this.trips.listParticipantIds(tripId);
    if (participants.length > 0) {
      await this.notifier.notifyMany({
        event: 'ADIANTAMENTO_SOLICITADO',
        message: `Adiantamento de R$ ${advance.valorSolicitado} solicitado para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        tripId,
        userIds: participants,
      });
    }

    return advance;
  }
}
