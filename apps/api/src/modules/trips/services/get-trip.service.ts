import { TripForbiddenViewError, TripNotFoundError } from '../trip.errors.js';
import { tripDetailToView } from '../presenters/trip.presenter.js';
import type { TripsRepository } from '../repositories/trips.repository.js';
import type { TripDetailView } from '../trip.types.js';

export class GetTripService {
  constructor(private readonly trips: TripsRepository) {}

  async execute(id: string, actorId: string, canViewAny: boolean): Promise<TripDetailView> {
    const trip = await this.trips.findDetailById(id);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const isParticipant = await this.trips.participantExists(id, actorId);
    if (!isParticipant && !canViewAny) {
      throw new TripForbiddenViewError();
    }

    return tripDetailToView(trip);
  }
}
