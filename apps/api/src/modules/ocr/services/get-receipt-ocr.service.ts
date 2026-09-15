import type { ReceiptsRepository } from '../../receipts/receipt.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeReceiptAccess } from '../ocr-authz.js';
import type { ReceiptOcrRecord, ReceiptOcrRepository } from '../ocr.types.js';

export class GetReceiptOcrService {
  constructor(
    private readonly receipts: ReceiptsRepository,
    private readonly trips: TripsRepository,
    private readonly ocr: ReceiptOcrRepository,
  ) {}

  async execute(
    receiptId: string,
    actorId: string,
    canManageFiscal: boolean,
  ): Promise<ReceiptOcrRecord> {
    await authorizeReceiptAccess(this.receipts, this.trips, receiptId, actorId, canManageFiscal);
    const record = await this.ocr.findByReceipt(receiptId);
    if (record) return record;
    return {
      receiptId,
      status: 'PENDENTE',
      origem: 'MANUAL',
      cnpj: null,
      nomeEstabelecimento: null,
      data: null,
      hora: null,
      valorTotal: null,
      numeroDocumento: null,
      chaveAcesso: null,
      itens: null,
      dadosOriginais: null,
      erro: null,
      engine: null,
      processingMs: null,
      confidence: null,
      attempts: 0,
      extraidoEm: null,
      conferidoPorId: null,
      conferidoPor: null,
      conferidoEm: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }
}
