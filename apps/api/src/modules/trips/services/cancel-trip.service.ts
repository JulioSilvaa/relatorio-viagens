import type { AuditService } from '../../../modules/audit/audit.service.js';
import {
  TripCancelReasonRequiredError,
  TripForbiddenCancelError,
  TripNotCancelableError,
  TripNotFoundError,
} from '../trip.errors.js';
import { tripToView } from '../presenters/trip.presenter.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import type { TripView } from '../trip.types.js';

export class CancelTripService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    id: string,
    motivo: string,
    actorId: string,
    actorRoleCode: string,
  ): Promise<TripView> {
    const trip = await this.trips.findById(id);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const canCancel = trip.criadoPorId === actorId || actorRoleCode === 'MANAGER_ADMIN';
    if (!canCancel) {
      throw new TripForbiddenCancelError();
    }

    if (!motivo || motivo.trim().length < 3) {
      throw new TripCancelReasonRequiredError();
    }

    if (trip.status === 'CANCELADA' || trip.status === 'FINALIZADA') {
      throw new TripNotCancelableError();
    }

    await this.trips.setStatus(id, 'CANCELADA', motivo.trim());

    await this.audit.record({
      userId: actorId,
      operation: 'CANCELAR',
      entityType: 'VIAGEM',
      entityId: id,
      field: 'status',
      oldValue: String(trip.status),
      newValue: 'CANCELADA',
      justification: motivo,
    });

    return tripToView({ ...trip, status: 'CANCELADA', motivoCancelamento: motivo.trim() });
  }
}
