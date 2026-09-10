import type { AuditService } from '../../../modules/audit/audit.service.js';
import {
  TripNotEditableError,
  TripNotFoundError,
  TripParticipantForbiddenError,
} from '../trip.errors.js';
import type { TripParticipantRecord, TripsRepository } from '../repositories/trips.repository.js';
import type { AddParticipantDto } from '../schemas/trip.schema.js';
import { PARTICIPANT_EDITABLE_TRIP_STATUSES } from '../trip.types.js';

export class AddParticipantService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    tripId: string,
    dto: AddParticipantDto,
    actorId: string,
    actorRoleCode: string,
  ): Promise<TripParticipantRecord> {
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

    const participant = await this.trips.addParticipant(tripId, dto.userId, actorId);

    await this.audit.record({
      userId: actorId,
      operation: 'ADICIONAR_PARTICIPANTE',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'participante',
      newValue: dto.userId,
    });

    return participant;
  }
}
