import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { ReceiptForbiddenError, ReceiptNotFoundError } from '../receipt.errors.js';
import type { ReceiptContext, ReceiptsRepository } from '../receipt.types.js';

export interface ReceiptFileResult {
  fileData: Uint8Array;
  fileType: string;
  fileName: string;
}

export class GetReceiptFileService {
  constructor(
    private readonly receipts: ReceiptsRepository,
    private readonly trips: TripsRepository,
  ) {}

  async execute(
    receiptId: string,
    actorId: string,
    canViewAny: boolean,
  ): Promise<ReceiptFileResult> {
    const receipt = await this.receipts.findById(receiptId);
    if (!receipt) {
      throw new ReceiptNotFoundError();
    }

    const canView = await this.canView(receipt, actorId, canViewAny);
    if (!canView) {
      throw new ReceiptForbiddenError();
    }

    return {
      fileData: receipt.fileData,
      fileType: receipt.fileType,
      fileName: receipt.fileName,
    };
  }

  private async canView(
    receipt: ReceiptContext,
    actorId: string,
    canViewAny: boolean,
  ): Promise<boolean> {
    if (canViewAny) return true;
    return this.trips.participantExists(receipt.expense.trip.id, actorId);
  }
}
