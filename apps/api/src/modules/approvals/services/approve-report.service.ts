import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { NotificationPublisher } from '../../notifications/notification-publisher.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import { ReportNotInApprovalError } from '../approval.errors.js';

export interface ApproveReportInput {
  taxaKm?: number | null;
}

export class ApproveReportService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly users: UsersRepository,
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
    private readonly notifier: NotificationPublisher,
  ) {}

  async execute(
    tripId: string,
    actorId: string,
    input: ApproveReportInput | undefined,
    actorCompanyId: string | null,
  ): Promise<void> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.deletadoEm || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }
    if (trip.status !== 'EM_APROVACAO') {
      throw new ReportNotInApprovalError();
    }

    if (input?.taxaKm != null) {
      const taxaKm = String(input.taxaKm);
      if (taxaKm !== trip.taxaKm) {
        await this.trips.update(tripId, { taxaKm });
        await this.audit.record({
          userId: actorId,
          operation: 'ATUALIZAR',
          entityType: 'VIAGEM',
          entityId: tripId,
          field: 'taxaKm',
          oldValue: trip.taxaKm ?? undefined,
          newValue: taxaKm,
        });
        // A correção de taxa vale só para esta viagem (nunca reescreve o valor
        // padrão configurado pelo admin) e precisa refletir no valor já lançado
        // da despesa de quilometragem — sem isso o relatório mostraria uma taxa
        // nova ao lado de um valor reembolsado calculado com a taxa antiga.
        if (trip.kmInicial && trip.kmFinal) {
          const kmPercorrido = Number(trip.kmFinal) - Number(trip.kmInicial);
          const novoValor = (kmPercorrido * Number(taxaKm)).toFixed(2);
          const despesasViagem = await this.expenses.listExpensesForTrip(tripId);
          for (const despesa of despesasViagem) {
            if (despesa.category.code !== 'KM_RODADOS') continue;
            if (despesa.valor === novoValor) continue;
            const limit = await this.expenses.getLimit(despesa.category.id, actorCompanyId);
            const alertaExcesso =
              limit && Number(novoValor) > Number(limit.valor)
                ? (Number(novoValor) - Number(limit.valor)).toFixed(2)
                : null;
            await this.expenses.updateExpense(despesa.id, { valor: novoValor, alertaExcesso });
            await this.audit.record({
              userId: actorId,
              operation: 'ALTERAR',
              entityType: 'DESPESA',
              entityId: despesa.id,
              field: 'valor',
              oldValue: despesa.valor,
              newValue: novoValor,
            });
          }
        }
      }
    }

    await this.trips.setStatus(tripId, 'APROVADA');

    await this.audit.record({
      userId: actorId,
      operation: 'APROVAR',
      entityType: 'VIAGEM',
      entityId: tripId,
      field: 'status',
      oldValue: 'EM_APROVACAO',
      newValue: 'APROVADA',
    });

    const participants = await this.trips.listParticipantIds(tripId);
    const finance = await this.users.findAllByRoleCode('FINANCE', actorCompanyId);
    const userIds = [...participants, ...finance.map((user) => user.id)];
    if (userIds.length > 0) {
      await this.notifier.notifyMany({
        event: 'RELATORIO_APROVADO',
        message: `Relatório aprovado: ${trip.cliente} (${trip.cidade}-${trip.uf}).`,
        tripId,
        userIds,
      });
    }
  }
}
