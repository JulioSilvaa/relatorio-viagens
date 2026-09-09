import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { ReportJustificationRequiredError, ReportNotInApprovalError } from '../approval.errors.js';

export class ReturnReportService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(tripId: string, justificativa: string, actorId: string): Promise<void> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }
    if (trip.status !== 'EM_APROVACAO') {
      throw new ReportNotInApprovalError();
    }
    if (!justificativa || justificativa.trim().length < 3) {
      throw new ReportJustificationRequiredError();
    }

    await this.trips.setStatus(tripId, 'EM_CORRECAO');

    await this.audit.record({
      userId: actorId,
      operation: 'RETORNAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: 'EM_APROVACAO',
      newValue: 'EM_CORRECAO',
      justification: justificativa.trim(),
    });

    const participants = await this.trips.listParticipantIds(tripId);
    if (participants.length > 0) {
      await this.notifier.notifyMany({
        event: 'RELATORIO_RETORNADO',
        message: `Relatório retornado para correção: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        tripId,
        userIds: participants,
      });
    }
  }
}
