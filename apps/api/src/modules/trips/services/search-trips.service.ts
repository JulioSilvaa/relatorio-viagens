import type {
  TripsRepository,
  TripSearchFilters,
  TripSearchResult,
} from '../repositories/trips.repository.js';

export class SearchTripsService {
  constructor(private readonly trips: TripsRepository) {}

  async execute(
    actorId: string,
    isGlobal: boolean,
    filters: TripSearchFilters,
    limit: number,
    offset: number,
    companyId: string | null,
  ): Promise<TripSearchResult> {
    return this.trips.searchTrips({
      filters,
      global: isGlobal,
      userId: actorId,
      companyId: companyId ?? '',
      limit,
      offset,
    });
  }
}
