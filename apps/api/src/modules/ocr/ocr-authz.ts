import type { ReceiptsRepository } from '../receipts/receipt.types.js';
import type { TripsRepository } from '../trips/repositories/trips.repository.js';
import { OcrForbiddenError, OcrReceiptNotFoundError } from './ocr.errors.js';

export interface OcrAuthzContext {
  expenseId: string;
  expenseCreatedById: string;
  tripId: string;
}

export async function authorizeReceiptAccess(
  receipts: ReceiptsRepository,
  trips: TripsRepository,
  receiptId: string,
  actorId: string,
  canManageFiscal: boolean,
): Promise<OcrAuthzContext> {
  const receipt = await receipts.findById(receiptId);
  if (!receipt) {
    throw new OcrReceiptNotFoundError();
  }

  const isAuthor = receipt.expense.createdById === actorId;
  const isParticipant = await trips.participantExists(receipt.expense.trip.id, actorId);
  if (!isAuthor && !isParticipant && !canManageFiscal) {
    throw new OcrForbiddenError();
  }

  return {
    expenseId: receipt.expense.id,
    expenseCreatedById: receipt.expense.createdById,
    tripId: receipt.expense.trip.id,
  };
}
