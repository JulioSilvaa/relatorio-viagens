import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { ReceiptsRepository } from '../../receipts/receipt.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeReceiptAccess } from '../ocr-authz.js';
import { normalizeAccessKey } from '../ocr-parser.js';
import type {
  OcrExtractionFields,
  OcrStoredItem,
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
  ) { }

  async execute(
    receiptId: string,
    actorId: string,
    canManageFiscal: boolean,
    input: OcrExtractionFields,
  ): Promise<ReceiptOcrRecord> {
    await authorizeReceiptAccess(this.receipts, this.trips, receiptId, actorId, canManageFiscal);

    const previous = await this.ocr.findByReceipt(receiptId);
    const data: SaveReceiptOcrData = {
      cnpj: input.cnpj ?? previous?.cnpj ?? null,
      nomeEstabelecimento: input.nomeEstabelecimento ?? previous?.nomeEstabelecimento ?? null,
      data: input.data ?? previous?.data ?? null,
      hora: input.hora ?? previous?.hora ?? null,
      valorTotal: input.valorTotal ?? previous?.valorTotal ?? null,
      numeroDocumento: input.numeroDocumento ?? previous?.numeroDocumento ?? null,
      chaveAcesso: normalizeAccessKey(input.chaveAcesso) ?? previous?.chaveAcesso ?? null,
      itens: mergeItens(input.itens, previous?.itens),
      dadosOriginais: input.dadosOriginais ?? previous?.dadosOriginais ?? null,
    };

    const editedByUser = previous !== null && hasUserEdits(previous, data);
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

function mergeItens(
  input: OcrStoredItem[] | undefined,
  previous: unknown[] | null | undefined,
): unknown[] | null {
  if (input && input.length > 0) return input;
  return previous ?? null;
}

function hasUserEdits(previous: ReceiptOcrRecord, data: SaveReceiptOcrData): boolean {
  const normalized = (value: string | null | undefined): string | undefined =>
    value?.replace(/\.0+$/, '');
  const dateEqual = (a?: Date | null, b?: Date | null): boolean =>
    (a?.getTime() ?? 0) === (b?.getTime() ?? 0);
  return (
    previous.cnpj !== data.cnpj ||
    previous.nomeEstabelecimento !== data.nomeEstabelecimento ||
    !dateEqual(previous.data, data.data) ||
    previous.hora !== data.hora ||
    previous.numeroDocumento !== data.numeroDocumento ||
    previous.chaveAcesso !== data.chaveAcesso ||
    normalized(previous.valorTotal) !== normalized(data.valorTotal)
  );
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
