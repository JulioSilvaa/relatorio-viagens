import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import { assertValidUpload, sha256, type UploadedFile } from '../../../shared/upload/files.js';
import { optimizeReceiptImage } from '../../../shared/upload/images.js';
import {
  ExpenseForbiddenError,
  ExpenseNotFoundError,
  ExpenseTripNotEditableError,
} from '../../expenses/expense.errors.js';
import type { ExpensesRepository } from '../../expenses/repositories/expenses.repository.js';
import { EDITABLE_TRIP_STATUSES } from '../../trips/trip.types.js';
import type { ReceiptType } from '@prisma/client';
import type { ReceiptsRepository } from '../receipt.types.js';
import type { ReceiptRecord } from '../receipt.types.js';

export interface UploadReceiptInput {
  expenseId: string;
  file: UploadedFile;
  tipo: ReceiptType;
  actorId: string;
  actorCompanyId: string | null;
}

export class UploadReceiptService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly receipts: ReceiptsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UploadReceiptInput): Promise<ReceiptRecord> {
    if (!input.actorCompanyId) throw new TenantRequiredError();
    assertValidUpload(input.file);

    const expense = await this.expenses.findExpenseForMutation(input.expenseId);
    if (!expense || expense.trip.deletadoEm || expense.trip.companyId !== input.actorCompanyId) {
      throw new ExpenseNotFoundError();
    }
    if (expense.createdById !== input.actorId) {
      throw new ExpenseForbiddenError();
    }
    if (!EDITABLE_TRIP_STATUSES.includes(expense.trip.status)) {
      throw new ExpenseTripNotEditableError();
    }
    const optimizedFile = await optimizeReceiptImage(input.file);

    const created = (
      await this.receipts.createReceipts(input.expenseId, [
        {
          fileData: optimizedFile.buffer,
          fileType: optimizedFile.mimetype,
          fileName: optimizedFile.originalname,
          fileSize: optimizedFile.size,
          fileHash: sha256(optimizedFile.buffer),
          tipo: input.tipo,
          uploadedById: input.actorId,
        },
      ])
    )[0]!;

    await this.audit.record({
      userId: input.actorId,
      operation: 'UPLOAD_COMPROVANTE',
      entityType: 'DESPESA',
      entityId: input.expenseId,
      field: 'comprovante',
      newValue: created.fileName,
    });

    return created;
  }
}
