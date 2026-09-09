import { tripToView } from '../presenters/trip.presenter.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import type { TripView } from '../trip.types.js';

export class ListTripsService {
  constructor(private readonly trips: TripsRepository) {}

  async execute(actorId: string, actorRoleCode: string): Promise<TripView[]> {
    const isManager = actorRoleCode === 'MANAGER_ADMIN';
    const records = isManager
      ? await this.trips.findAll()
      : await this.trips.findByParticipant(actorId);
    return records.map(tripToView);
  }
}
