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
    const data = await this.repository.getReportData(tripId, emitidoPor);
    const participant = data.participantes.some((p) => p.id === actorId);
    if (!participant && !canViewAny) {
      throw new ReportForbiddenError();
    }
    const content = await renderManagerPdf(data, { attachments: [] });
    return {
      data,
      fileName: `resumo-gerencial-${tripId}.pdf`,
      content,
    };
  }
}
