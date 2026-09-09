import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { FinanceRepository, PaymentComprovante, TripRefundRecord } from '../finance.types.js';

export class RegisterRefundService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    tripId: string,
    input: {
      valor: string;
      data: Date;
      metodoDePagamento: string;
      observacoes: string | null;
      comprovante: PaymentComprovante | null;
    },
    actorId: string,
  ): Promise<TripRefundRecord> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm) {
      throw new TripNotFoundError();
    }

    const refund = await this.finance.registerRefund({
      tripId,
      valor: input.valor,
      data: input.data,
      metodoDePagamento: input.metodoDePagamento,
      observacoes: input.observacoes,
      comprovante: input.comprovante,
      registradoPorId: actorId,
    });

    await this.audit.record({
      userId: actorId,
      operation: 'DEVOLUCAO.REGISTRAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'devolucao',
      oldValue: undefined,
      newValue: refund.valor,
      justification: `Método: ${refund.metodoDePagamento}`,
    });

    return refund;
  }
}
