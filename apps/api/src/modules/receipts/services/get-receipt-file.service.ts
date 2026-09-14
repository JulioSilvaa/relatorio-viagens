import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import type { AuditService } from '../../audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { ReceiptForbiddenError, ReceiptNotFoundError } from '../receipt.errors.js';
import type { ReceiptsRepository } from '../receipt.types.js';

export interface ReceiptFileResult {
  fileData: Uint8Array;
  fileType: string;
  fileName: string;
}

export class GetReceiptFileService {
  constructor(
    private readonly receipts: ReceiptsRepository,
    private readonly trips: TripsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    receiptId: string,
    actorId: string,
    canViewAny: boolean,
    actorCompanyId: string | null,
  ): Promise<ReceiptFileResult> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const receipt = await this.receipts.findById(receiptId);
    if (!receipt || receipt.expense.trip.companyId !== actorCompanyId) {
      throw new ReceiptNotFoundError();
    }

    const involvedWithTrip =
      receipt.expense.createdById === actorId ||
      (await this.trips.participantExists(receipt.expense.trip.id, actorId));

    if (!involvedWithTrip && !canViewAny) {
      throw new ReceiptForbiddenError();
    }

    if (!involvedWithTrip && canViewAny) {
      await this.audit.record({
        userId: actorId,
        operation: 'ACESSAR',
        entityType: 'COMPROVANTE',
        entityId: receipt.id,
        field: 'arquivo',
        newValue: 'download-por-permissao',
      });
    }

    return {
      fileData: receipt.fileData,
      fileType: receipt.fileType,
      fileName: receipt.fileName,
    };
  }
}
