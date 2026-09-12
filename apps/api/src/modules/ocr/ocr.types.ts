import type { OcrProcessingStatus, OcrSourceType } from '@prisma/client';

export interface OcrExtractionFields {
  textoOriginal?: string;
  cnpj?: string;
  nomeEstabelecimento?: string;
  data?: Date;
  hora?: string;
  valorTotal?: string;
  valorProdutos?: string;
  desconto?: string;
  tributos?: string;
  numeroDocumento?: string;
  serie?: string;
  inscricaoEstadual?: string;
  emitente?: string;
  destinatario?: string;
  formaPagamento?: string;
  protocoloAutorizacao?: string;
  chaveAcesso?: string;
  itens?: unknown[];
}

export type OcrExtractionResult =
  | { status: 'SUCESSO'; data: OcrExtractionFields }
  | { status: 'FALHA'; erro: string };

export interface OcrExtractInput {
  fileData: Uint8Array;
  fileType: string;
  fileName: string;
}

export interface OcrProvider {
  extract(input: OcrExtractInput): Promise<OcrExtractionResult>;
}

export interface ReceiptOcrRecord {
  receiptId: string;
  status: OcrProcessingStatus;
  origem: OcrSourceType;
  cnpj: string | null;
  nomeEstabelecimento: string | null;
  data: Date | null;
  hora: string | null;
  valorTotal: string | null;
  numeroDocumento: string | null;
  chaveAcesso: string | null;
  itens: unknown[] | null;
  dadosOriginais: OcrExtractionFields | null;
  erro: string | null;
  extraidoEm: Date | null;
  conferidoPorId: string | null;
  conferidoPor: { id: string; name: string } | null;
  conferidoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveReceiptOcrData {
  status?: OcrProcessingStatus;
  origem?: OcrSourceType;
  cnpj?: string | null;
  nomeEstabelecimento?: string | null;
  data?: Date | null;
  hora?: string | null;
  valorTotal?: string | null;
  numeroDocumento?: string | null;
  chaveAcesso?: string | null;
  itens?: unknown[] | null;
  dadosOriginais?: OcrExtractionFields | null;
  erro?: string | null;
}

export interface ReceiptOcrRepository {
  findByReceipt(receiptId: string): Promise<ReceiptOcrRecord | null>;
  saveExtraction(
    receiptId: string,
    data: SaveReceiptOcrData,
    extraidoEm: Date,
  ): Promise<ReceiptOcrRecord>;
  confirm(
    receiptId: string,
    data: SaveReceiptOcrData,
    conferidoPorId: string,
  ): Promise<ReceiptOcrRecord>;
}
