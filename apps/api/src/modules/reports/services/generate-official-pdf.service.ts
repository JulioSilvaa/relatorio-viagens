import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import { renderOfficialPdf } from '../report-pdf.js';
import { ReportForbiddenError, ReportNotApprovedError } from '../reports.errors.js';
import type { GeneratedOfficialReport, ReportsRepository } from '../report.types.js';

const OFFICIAL_APPROVED_STATUSES = ['APROVADA', 'FINANCEIRO', 'FINALIZADA'];
const AUDIT_ENTITY = 'RELATORIO_OFICIAL';

export class GenerateOfficialPdfService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    tripId: string,
    actorId: string,
    canViewAny: boolean,
    emitidoPor: string,
    anexarComprovantes: boolean,
    actorCompanyId: string | null,
  ): Promise<GeneratedOfficialReport> {
    if (!actorCompanyId) throw new TenantRequiredError();
    if (!canViewAny) {
      throw new ReportForbiddenError();
    }
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.companyId !== actorCompanyId) {
      throw new TripNotFoundError();
    }
    const data = await this.repository.getReportData(tripId, emitidoPor);
    if (!OFFICIAL_APPROVED_STATUSES.includes(data.trip.status)) {
      throw new ReportNotApprovedError();
    }

    const previous = await this.audit.list({
      filters: { entityType: AUDIT_ENTITY, entityId: tripId, operation: 'GERAR' },
      limit: 1,
      offset: 0,
    });
    const versao = previous.total + 1;
    data.versao = versao;

    const attachments = anexarComprovantes ? await this.repository.listImageReceipts(tripId) : [];
    const content = await renderOfficialPdf(data, { attachments });

    await this.audit.record({
      userId: actorId,
      operation: 'GERAR',
      entityType: AUDIT_ENTITY,
      entityId: tripId,
      field: 'versao',
      oldValue: versao > 1 ? `v${versao - 1}` : undefined,
      newValue: `v${versao}`,
    });

    return {
      data,
      fileName: 'relatorio-oficial-viagem.pdf',
      content,
    };
  }
}
