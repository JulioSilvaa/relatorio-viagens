import type { AuditService } from '../../../modules/audit/audit.service.js';
import {
  TripForbiddenDeleteError,
  TripNotDeletableError,
  TripNotFoundError,
} from '../trip.errors.js';
import type { TripsRepository } from '../repositories/trips.repository.js';

export class DeleteTripService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, actorId: string): Promise<void> {
    const trip = await this.trips.findById(id);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    if (trip.criadoPorId !== actorId) {
      throw new TripForbiddenDeleteError();
    }

    if (trip.status !== 'EM_ANDAMENTO') {
      throw new TripNotDeletableError();
    }

    await this.trips.softDelete(id, actorId);

    await this.audit.record({
      userId: actorId,
      operation: 'EXCLUIR',
      entityType: 'VIAGEM',
      entityId: id,
      oldValue: trip.status,
    });
  }
}
