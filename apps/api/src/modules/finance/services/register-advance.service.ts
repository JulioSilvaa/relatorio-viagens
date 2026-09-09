import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { FinanceRepository, TripAdvanceRecord } from '../finance.types.js';

export class RegisterAdvanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    tripId: string,
    input: { valor: string; data: Date; observacoes: string | null },
    actorId: string,
  ): Promise<TripAdvanceRecord> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const advance = await this.finance.registerAdvance({
      tripId,
      valor: input.valor,
      data: input.data,
      observacoes: input.observacoes,
      registradoPorId: actorId,
    });

    await this.audit.record({
      userId: actorId,
      operation: 'ADIANTAMENTO.REGISTRAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'adiantamento',
      oldValue: undefined,
      newValue: advance.valor,
    });

    return advance;
  }
}
