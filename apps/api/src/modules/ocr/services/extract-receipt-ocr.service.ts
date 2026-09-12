import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { ReceiptsRepository } from '../../receipts/receipt.types.js';
import type { TripsRepository } from '../../trips/repositories/trips.repository.js';
import { authorizeReceiptAccess } from '../ocr-authz.js';
import type { OcrProvider, ReceiptOcrRecord, ReceiptOcrRepository } from '../ocr.types.js';

export class ExtractReceiptOcrService {
  constructor(
    private readonly receipts: ReceiptsRepository,
    private readonly trips: TripsRepository,
    private readonly ocr: ReceiptOcrRepository,
    private readonly provider: OcrProvider,
    private readonly audit: AuditService,
  ) { }

  async execute(
    receiptId: string,
    actorId: string,
    canManageFiscal: boolean,
  ): Promise<ReceiptOcrRecord> {
    await authorizeReceiptAccess(this.receipts, this.trips, receiptId, actorId, canManageFiscal);

    const receipt = (await this.receipts.findById(receiptId))!;
    const extraction = await this.provider.extract({
      fileData: receipt.fileData,
      fileType: receipt.fileType,
      fileName: receipt.fileName,
    });
    const extraidoEm = new Date();

    if (extraction.status === 'SUCESSO') {
      await this.audit.record({
        userId: actorId,
        operation: 'OCR.EXTRAIR',
        entityType: 'COMPROVANTE',
        entityId: receiptId,
        field: 'ocrStatus',
        oldValue: undefined,
        newValue: 'SUCESSO',
      });
      return this.ocr.saveExtraction(
        receiptId,
        {
          status: 'SUCESSO',
          origem: 'OCR',
          cnpj: extraction.data.cnpj ?? '',
          nomeEstabelecimento: extraction.data.nomeEstabelecimento ?? '',
          data: extraction.data.data ?? null,
          hora: extraction.data.hora ?? '',
          valorTotal: extraction.data.valorTotal ?? '',
          numeroDocumento: extraction.data.numeroDocumento ?? '',
          chaveAcesso: extraction.data.chaveAcesso ?? '',
          itens: extraction.data.itens ?? [],
          dadosOriginais: extraction.data,
          erro: null,
        },
        extraidoEm,
      );
    }

    await this.audit.record({
      userId: actorId,
      operation: 'OCR.EXTRAIR',
      entityType: 'COMPROVANTE',
      entityId: receiptId,
      field: 'ocrStatus',
      oldValue: undefined,
      newValue: 'FALHA',
      justification: extraction.erro,
    });
    return this.ocr.saveExtraction(
      receiptId,
      { status: 'FALHA', erro: extraction.erro, origem: 'MANUAL' },
      extraidoEm,
    );
  }
}
