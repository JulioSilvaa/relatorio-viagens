import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { UserIdRef, UsersRepository } from '../../users/repositories/users.repository.js';
import {
  TripForbiddenViewError,
  TripNotDeliverableError,
  TripNotFoundError,
  TripReportIncompleteError,
} from '../trip.errors.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import { EDITABLE_TRIP_STATUSES } from '../trip.types.js';

export class DeliverReportService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(tripId: string, actorId: string): Promise<void> {
    const trip = await this.trips.findDetailById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    if (!EDITABLE_TRIP_STATUSES.includes(trip.status)) {
      throw new TripNotDeliverableError();
    }

    const isParticipant = await this.trips.participantExists(tripId, actorId);
    if (!isParticipant) {
      throw new TripForbiddenViewError();
    }

    const pending: string[] = [];
    for (const expense of trip.expenses ?? []) {
      const hasActiveReceipt = expense.receipts.some((receipt) => receipt.ativo);
      if (!hasActiveReceipt) {
        pending.push(`${expense.criadoPor.name} · ${expense.category.name} · R$ ${expense.valor}`);
      }
    }

    if (pending.length > 0) {
      throw new TripReportIncompleteError(pending);
    }

    const wasCorrection = trip.status === 'EM_CORRECAO';
    await this.trips.setStatus(tripId, 'EM_APROVACAO');

    await this.audit.record({
      userId: actorId,
      operation: 'ENTREGAR_RELATORIO',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: String(trip.status),
      newValue: 'EM_APROVACAO',
    });

    const managers = await this.users.findAllByRoleCode('MANAGER_ADMIN');
    if (managers.length > 0) {
      await this.notifier.notifyMany({
        event: wasCorrection ? 'RELATORIO_REENVIADO' : 'RELATORIO_ENTREGUE',
        message: `Relatório ${wasCorrection ? 'reenviado' : 'entregue'}: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        tripId,
        userIds: managers.map((manager: UserIdRef) => manager.id),
      });
    }
  }
}
