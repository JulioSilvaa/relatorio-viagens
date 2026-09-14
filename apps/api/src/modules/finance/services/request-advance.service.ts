import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import {
  AdvanceAlreadyRequestedError,
  AdvanceCorrectionForbiddenError,
} from '../finance.errors.js';
import type { FinanceRepository, TripAdvanceRecord } from '../finance.types.js';

export class RequestAdvanceService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
    private readonly users: UsersRepository,
  ) {}

  async execute(
    tripId: string,
    input: { valorSolicitado: string; justificativaSolicitacao: string },
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<TripAdvanceRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }

    const current = await this.finance.findLatestAdvanceByTrip(tripId);
    if (current?.status === 'SOLICITADO') {
      if (current.solicitadoPor.id !== actorId) {
        throw new AdvanceCorrectionForbiddenError();
      }
      const corrected = await this.finance.updateAdvanceRequest({
        advanceId: current.id,
        valorSolicitado: input.valorSolicitado,
        justificativaSolicitacao: input.justificativaSolicitacao,
      });
      await this.audit.record({
        userId: actorId,
        operation: 'ADIANTAMENTO.CORRIGIR',
        entityType: 'VIAGEM',
        entityId: tripId,
        field: 'adiantamento',
        oldValue: current.valorSolicitado,
        newValue: corrected.valorSolicitado,
        justification: input.justificativaSolicitacao,
      });
      await this.notifyManagers(
        trip.cliente,
        trip.cidade,
        trip.uf,
        tripId,
        actorCompanyId,
        `Adiantamento corrigido de R$ ${current.valorSolicitado} para R$ ${corrected.valorSolicitado}.`,
        `Motivo informado: ${input.justificativaSolicitacao}`,
      );
      return corrected;
    }
    if (current && current.status !== 'RECUSADO') {
      throw new AdvanceAlreadyRequestedError();
    }

    const advance = await this.finance.createAdvanceRequest({
      tripId,
      valorSolicitado: input.valorSolicitado,
      justificativaSolicitacao: input.justificativaSolicitacao,
      solicitadoPorId: actorId,
    });

    await this.audit.record({
      userId: actorId,
      operation: 'ADIANTAMENTO.SOLICITAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'adiantamento',
      oldValue: undefined,
      newValue: advance.valorSolicitado,
    });

    await this.notifyManagers(
      trip.cliente,
      trip.cidade,
      trip.uf,
      tripId,
      actorCompanyId,
      `Adiantamento de R$ ${advance.valorSolicitado} solicitado para a viagem: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
    );

    return advance;
  }

  private async notifyManagers(
    cliente: string,
    cidade: string,
    uf: string,
    tripId: string,
    companyId: string,
    message: string,
    detail?: string,
  ): Promise<void> {
    const managers = await this.users.findAllByRoleCode('MANAGER_ADMIN', companyId);
    if (managers.length === 0) return;
    await this.notifier.notifyMany({
      event: 'ADIANTAMENTO_SOLICITADO',
      message: message || `Adiantamento atualizado para a viagem: ${cliente} (${cidade}-${uf}).`,
      detail,
      tripId,
      userIds: managers.map((manager) => manager.id),
    });
  }
}
