import type { AuditService } from '../../../modules/audit/audit.service.js';
import { FinanceTripNotApprovedError } from '../finance.errors.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';

export class ReceiveFinanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(tripId: string, actorId: string): Promise<void> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }
    if (trip.status !== 'APROVADA') {
      throw new FinanceTripNotApprovedError();
    }

    await this.trips.setStatus(tripId, 'FINANCEIRO');

    await this.audit.record({
      userId: actorId,
      operation: 'PAGAMENTO.RECEBER',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: 'APROVADA',
      newValue: 'FINANCEIRO',
    });
  }
}
