import { TripNotFoundError } from '../../trips/trip.errors.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { PrismaReceiptsRepository } from '../../receipts/receipts.repository.prisma.js';
import type { FinanceRepository } from '../../finance/finance.types.js';
import { buildReportData } from '../report.data.js';
import type { PdfAttachment, ReportData, ReportsRepository } from '../report.types.js';

export class PrismaReportsRepository implements ReportsRepository {
  private readonly receipts: PrismaReceiptsRepository;

  constructor(
    private readonly trips: TripsRepository,
    private readonly finance: FinanceRepository,
  ) {
    this.receipts = new PrismaReceiptsRepository();
  }

  async getReportData(tripId: string, emitidoPor: string): Promise<ReportData> {
    const trip = await this.trips.findDetailById(tripId);
    if (!trip) {
      throw new TripNotFoundError();
    }
    const finance = await this.finance.listByTrip(tripId);
    return buildReportData(trip, finance, emitidoPor);
  }

  async listImageReceipts(tripId: string): Promise<PdfAttachment[]> {
    const trip = await this.trips.findDetailById(tripId);
    if (!trip) {
      throw new TripNotFoundError();
    }
    const attachments: PdfAttachment[] = [];
    for (const expense of trip.expenses ?? []) {
      if (expense.deletedAt !== null) continue;
      for (const receipt of expense.receipts) {
        if (!receipt.ativo) continue;
        if (!receipt.fileType.startsWith('image/')) continue;
        const record = await this.receipts.findById(receipt.id);
        if (record) {
          attachments.push({ fileName: receipt.fileName, data: record.fileData });
        }
      }
    }
    return attachments;
  }
}
