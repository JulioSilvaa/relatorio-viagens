import { renderOfficialPdf } from '../report-pdf.js';
import { ReportForbiddenError } from '../reports.errors.js';
import type { GeneratedOfficialReport, ReportsRepository } from '../report.types.js';

export class GenerateOfficialPdfService {
  constructor(private readonly repository: ReportsRepository) {}

  async execute(
    tripId: string,
    actorId: string,
    canViewAny: boolean,
    emitidoPor: string,
    anexarComprovantes: boolean,
  ): Promise<GeneratedOfficialReport> {
    const data = await this.repository.getReportData(tripId, emitidoPor);
    const participant = data.participantes.some((p) => p.id === actorId);
    if (!participant && !canViewAny) {
      throw new ReportForbiddenError();
    }
    const attachments = anexarComprovantes ? await this.repository.listImageReceipts(tripId) : [];
    const content = await renderOfficialPdf(data, { attachments });
    return {
      data,
      fileName: `relatorio-viagem-${tripId}.pdf`,
      content,
    };
  }
}
