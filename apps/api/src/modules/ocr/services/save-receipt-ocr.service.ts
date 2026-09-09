import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { ReceiptsRepository } from '../../receipts/receipt.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeReceiptAccess } from '../ocr-authz.js';
import type {
  OcrExtractionFields,
  ReceiptOcrRecord,
  ReceiptOcrRepository,
  SaveReceiptOcrData,
} from '../ocr.types.js';

export class SaveReceiptOcrService {
  constructor(
    private readonly receipts: ReceiptsRepository,
    private readonly trips: TripsRepository,
    private readonly ocr: ReceiptOcrRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    receiptId: string,
    actorId: string,
    canManageFiscal: boolean,
    input: OcrExtractionFields,
  ): Promise<ReceiptOcrRecord> {
    await authorizeReceiptAccess(this.receipts, this.trips, receiptId, actorId, canManageFiscal);

    const previous = await this.ocr.findByReceipt(receiptId);
    const data: SaveReceiptOcrData = {
      cnpj: input.cnpj ?? null,
      nomeEstabelecimento: input.nomeEstabelecimento ?? null,
      data: input.data ?? null,
      hora: input.hora ?? null,
      valorTotal: input.valorTotal ?? null,
      numeroDocumento: input.numeroDocumento ?? null,
      chaveAcesso: input.chaveAcesso ?? null,
      itens: input.itens ?? null,
    };

    const normalized = (value: string | null | undefined): string | undefined =>
      value?.replace(/\.0+$/, '');
    const changed =
      previous?.cnpj !== data.cnpj ||
      previous?.nomeEstabelecimento !== data.nomeEstabelecimento ||
      previous?.hora !== data.hora ||
      previous?.numeroDocumento !== data.numeroDocumento ||
      previous?.chaveAcesso !== data.chaveAcesso ||
      normalized(previous?.valorTotal) !== normalized(data.valorTotal);
    const editedByUser = previous !== null && changed;
    if (!previous) data.origem = 'MANUAL';
    else data.origem = editedByUser ? 'MANUAL' : previous.origem;

    const saved = await this.ocr.confirm(receiptId, data, actorId);

    await this.audit.record({
      userId: actorId,
      operation: editedByUser ? 'OCR.CORRIGIR' : 'OCR.CONFIRMAR',
      entityType: 'COMPROVANTE',
      entityId: receiptId,
      field: 'ocr',
      oldValue: previous ? JSON.stringify(toComparable(previous)) : undefined,
      newValue: JSON.stringify(toComparable(saved)),
      justification: editedByUser ? 'Colaborador corrigiu dados extraídos.' : undefined,
    });

    return saved;
  }
}

function toComparable(record: ReceiptOcrRecord) {
  return {
    cnpj: record.cnpj,
    nomeEstabelecimento: record.nomeEstabelecimento,
    data: record.data,
    hora: record.hora,
    valorTotal: record.valorTotal,
    numeroDocumento: record.numeroDocumento,
    chaveAcesso: record.chaveAcesso,
  };
}
