import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { ReceiptInsertData } from '../../receipts/receipt.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { EDITABLE_TRIP_STATUSES } from '../../trips/trip.types.js';
import { assertValidUpload, sha256 } from '../../../shared/upload/files.js';
import { optimizeReceiptImage } from '../../../shared/upload/images.js';
import {
  ExpenseCategoryInactiveError,
  ExpenseCategoryNotFoundError,
  ExpenseForbiddenError,
  ExpenseInvalidValueError,
  ExpenseKmDataMissingError,
  ExpenseReceiptRequiredError,
  ExpenseSingleReceiptError,
  ExpenseTripNotFoundError,
  ExpenseTripNotEditableError,
} from '../expense.errors.js';
import { expenseToView } from '../presenters/expense.presenter.js';
import type { ExpensesRepository } from '../repositories/expenses.repository.js';
import type { CreateExpenseDto } from '../schemas/expense.schema.js';
import type { ExpenseView } from '../expense.types.js';

export interface ExpenseUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export class CreateExpenseService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
    private readonly onReceiptCreated: (receiptId: string, actorId: string) => void = () => { },
  ) { }

  async execute(
    dto: CreateExpenseDto,
    files: ExpenseUploadFile[],
    actorId: string,
    actorName: string,
  ): Promise<ExpenseView> {
    if (!files || files.length === 0) {
      throw new ExpenseReceiptRequiredError();
    }
    if (files.length > 1) {
      throw new ExpenseSingleReceiptError();
    }
    for (const file of files) {
      assertValidUpload(file);
    }
    const trip = await this.trips.findById(dto.tripId);
    if (!trip || trip.deletadoEm) {
      throw new ExpenseTripNotFoundError();
    }
    if (!EDITABLE_TRIP_STATUSES.includes(trip.status)) {
      throw new ExpenseTripNotEditableError();
    }
    const isParticipant = await this.trips.participantExists(dto.tripId, actorId);
    if (!isParticipant) {
      throw new ExpenseForbiddenError();
    }

    const category = await this.expenses.findCategoryByCode(dto.categoryCode);
    if (!category) {
      throw new ExpenseCategoryNotFoundError();
    }
    if (!category.ativa) {
      throw new ExpenseCategoryInactiveError();
    }

    let valor = dto.valor;
    if (category.code === 'KM_RODADOS') {
      if (!trip.kmInicial || !trip.kmFinal || !trip.taxaKm) {
        throw new ExpenseKmDataMissingError();
      }
      const kmPercorrido = Number(trip.kmFinal) - Number(trip.kmInicial);
      valor = (kmPercorrido * Number(trip.taxaKm)).toFixed(2);
    } else if (Number(valor) <= 0) {
      throw new ExpenseInvalidValueError();
    }

    const alertaExcesso = await this.computeExcesso(category.id, valor);
    const optimizedFiles = await Promise.all(files.map(optimizeReceiptImage));

    const receipts: ReceiptInsertData[] = optimizedFiles.map((file) => ({
      fileData: file.buffer,
      fileType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      fileHash: sha256(file.buffer),
      tipo: dto.tipoComprovante,
      uploadedById: actorId,
    }));

    const { expense: created, receipts: createdReceipts } =
      await this.expenses.createExpenseWithReceipts({
        tripId: dto.tripId,
        categoryId: category.id,
        createdById: actorId,
        createdByName: actorName,
        valor,
        dataDespesa: dto.dataDespesa,
        reembolsavel: dto.reembolsavel,
        justificativa: dto.justificativa,
        alertaExcesso,
        receipts,
      });

    await this.audit.record({
      userId: actorId,
      operation: 'CRIAR',
      entityType: 'DESPESA',
      entityId: created.id,
      newValue: `${category.name} · R$ ${created.valor}`,
    });

    for (const receipt of receipts) {
      await this.audit.record({
        userId: actorId,
        operation: 'UPLOAD_COMPROVANTE',
        entityType: 'DESPESA',
        entityId: created.id,
        field: 'comprovante',
        newValue: receipt.fileName,
      });
    }

    for (const receipt of createdReceipts) {
      this.onReceiptCreated(receipt.id, actorId);
    }

    return expenseToView(created);
  }

  private async computeExcesso(categoryId: string, valor: string): Promise<string | null> {
    const limit = await this.expenses.getLimit(categoryId);
    if (!limit) return null;
    const valorNum = Number(valor);
    const limitNum = Number(limit.valor);
    return valorNum > limitNum ? (valorNum - limitNum).toFixed(2) : null;
  }
}
