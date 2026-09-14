import { tripToView } from '../presenters/trip.presenter.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import type { TripView } from '../trip.types.js';

export class ListTripsService {
  constructor(private readonly trips: TripsRepository) {}

  async execute(
    actorId: string,
    actorRoleCode: string,
    companyId: string | null,
  ): Promise<TripView[]> {
    if (!companyId) return [];
    const isManager = actorRoleCode === 'MANAGER_ADMIN';
    const records = isManager
      ? await this.trips.findAll(companyId)
      : await this.trips.findByParticipant(actorId, companyId);
    return records.map(tripToView);
  }
}
