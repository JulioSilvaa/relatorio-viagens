import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { CostCentersRepository } from '../../cost-centers/repositories/cost-centers.repository.js';
import {
  CostCenterNotFoundError,
  TripForbiddenEditError,
  TripNotEditableError,
  TripNotFoundError,
} from '../trip.errors.js';
import { tripToView } from '../presenters/trip.presenter.js';
import type { TripRecord, TripsRepository } from '../repositories/trips.repository.js';
import type { UpdateTripDto } from '../schemas/trip.schema.js';
import { EDITABLE_TRIP_STATUSES, type TripView } from '../trip.types.js';
import { assertValidTripDates, assertValidTripKms } from './trip-rules.js';

export class EditTripService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly costCenters: CostCentersRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateTripDto,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<TripView> {
    const trip = await this.trips.findById(id);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }

    if (trip.criadoPorId !== actorId) {
      throw new TripForbiddenEditError();
    }

    if (!EDITABLE_TRIP_STATUSES.includes(trip.status)) {
      throw new TripNotEditableError();
    }

    if (dto.dataSaida && dto.dataRetorno) {
      assertValidTripDates(dto.dataSaida, dto.dataRetorno);
    }
    assertValidTripKms(dto.kmInicial, dto.kmFinal);

    if (dto.centroDeCustoId) {
      const center = await this.costCenters.findActiveById(dto.centroDeCustoId, actorCompanyId);
      if (!center) {
        throw new CostCenterNotFoundError();
      }
    }

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        data[key] =
          (key === 'kmInicial' || key === 'kmFinal') && value != null ? String(value) : value;
      }
    }

    const updated = await this.trips.update(id, data);

    const fields = Object.keys(dto) as (keyof UpdateTripDto)[];
    for (const field of fields) {
      const before = stringifyField(trip, field);
      const after = stringifyField(updated, field);
      if (before !== after) {
        await this.audit.record({
          userId: actorId,
          operation: 'ALTERAR',
          entityType: 'VIAGEM',
          entityId: id,
          field,
          oldValue: before,
          newValue: after,
        });
      }
    }

    return tripToView(updated);
  }
}

function stringifyField(trip: TripRecord, field: keyof UpdateTripDto): string | undefined {
  const value = (trip as unknown as Record<string, unknown>)[field];
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
