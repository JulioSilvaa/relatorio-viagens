import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { TripNotFoundError } from '../../trips/trip.errors.js';
import { renderManagerPdf } from '../report-pdf.js';
import { ReportForbiddenError } from '../reports.errors.js';
import type { GeneratedOfficialReport, ReportsRepository } from '../report.types.js';

export class GenerateManagerPdfService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly trips: TripsRepository,
  ) {}

  async execute(
    tripId: string,
    actorId: string,
    canViewAny: boolean,
    emitidoPor: string,
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
    const attachments = await this.repository.listImageReceipts(tripId);
    const content = await renderManagerPdf(data, { attachments });
    return {
      data,
      fileName: 'resumo-gerencial-viagem.pdf',
      content,
    };
  }
}
