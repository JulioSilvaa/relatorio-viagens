import { prisma } from '../../../config/database.js';
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
    const company = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { company: { select: { name: true } } },
    });
    return buildReportData(trip, finance, emitidoPor, company?.company.name);
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
        if (!isImageReceipt(receipt.fileType, receipt.fileName)) continue;
        const record = await this.receipts.findById(receipt.id);
        if (record) {
          attachments.push({
            receiptId: receipt.id,
            fileHash: receipt.fileHash,
            fileName: receipt.fileName,
            data: record.fileData,
          });
        }
      }
    }
    return attachments;
  }
}

function isImageReceipt(fileType: string, fileName: string): boolean {
  return fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName);
}
