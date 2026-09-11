import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { ReportNotInApprovalError } from '../approval.errors.js';

export interface ApproveReportInput {
  taxaKm?: number | null;
}

export class ApproveReportService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(tripId: string, actorId: string, input?: ApproveReportInput): Promise<void> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }
    if (trip.status !== 'EM_APROVACAO') {
      throw new ReportNotInApprovalError();
    }

    if (input?.taxaKm != null) {
      const taxaKm = String(input.taxaKm);
      if (taxaKm !== trip.taxaKm) {
        await this.trips.update(tripId, { taxaKm });
        await this.audit.record({
          userId: actorId,
          operation: 'ATUALIZAR',
          entityType: 'VIAGEM',
          entityId: tripId,
          field: 'taxaKm',
          oldValue: trip.taxaKm ?? undefined,
          newValue: taxaKm,
        });
      }
    }

    await this.trips.setStatus(tripId, 'APROVADA');

    await this.audit.record({
      userId: actorId,
      operation: 'APROVAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: 'EM_APROVACAO',
      newValue: 'APROVADA',
    });

    const participants = await this.trips.listParticipantIds(tripId);
    const finance = await this.users.findAllByRoleCode('FINANCE');
    const userIds = [...participants, ...finance.map((user) => user.id)];
    if (userIds.length > 0) {
      await this.notifier.notifyMany({
        event: 'RELATORIO_APROVADO',
        message: `Relatório aprovado: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        tripId,
        userIds,
      });
    }
  }
}
