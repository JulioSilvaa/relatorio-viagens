import { renderManagerPdf } from '../report-pdf.js';
import { ReportForbiddenError } from '../reports.errors.js';
import type { GeneratedOfficialReport, ReportsRepository } from '../report.types.js';

export class GenerateManagerPdfService {
  constructor(private readonly repository: ReportsRepository) {}

  async execute(
    tripId: string,
    actorId: string,
    canViewAny: boolean,
    emitidoPor: string,
  ): Promise<GeneratedOfficialReport> {
    if (!canViewAny) {
      throw new ReportForbiddenError();
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
