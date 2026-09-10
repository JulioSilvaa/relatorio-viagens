import type { AuditService } from '../../../modules/audit/audit.service.js';
import {
  TripNotEditableError,
  TripNotFoundError,
  TripParticipantForbiddenError,
  TripParticipantNotFoundError,
  TripRemoveCreatorError,
} from '../trip.errors.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import { PARTICIPANT_EDITABLE_TRIP_STATUSES } from '../trip.types.js';

export class RemoveParticipantService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    tripId: string,
    userId: string,
    actorId: string,
    actorRoleCode: string,
  ): Promise<void> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const canManage = trip.criadoPorId === actorId || actorRoleCode === 'MANAGER_ADMIN';
    if (!canManage) {
      throw new TripParticipantForbiddenError();
    }

    if (!PARTICIPANT_EDITABLE_TRIP_STATUSES.includes(trip.status)) {
      throw new TripNotEditableError();
    }

    if (trip.criadoPorId === userId) {
      throw new TripRemoveCreatorError();
    }

    const removed = await this.trips.removeParticipant(tripId, userId);
    if (!removed) {
      throw new TripParticipantNotFoundError();
    }

    await this.audit.record({
      userId: actorId,
      operation: 'REMOVER_PARTICIPANTE',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'participante',
      newValue: userId,
    });
  }
}
