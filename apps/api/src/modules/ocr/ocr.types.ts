import type { OcrProcessingStatus, OcrSourceType } from '@prisma/client';

export type OcrExtractionConfidence = 'alta' | 'media' | 'baixa';

export type OcrDocumentType =
  | 'NFC_E'
  | 'CFE_SAT'
  | 'NFE'
  | 'RECIBO'
  | 'COMPROVANTE_PAGAMENTO'
  | 'OUTRO'
  | 'NAO_IDENTIFICADO';

export interface OcrExtraField {
  secao?: string | null;
  label: string;
  valor?: string | null;
  confianca?: OcrExtractionConfidence | null;
}

export interface OcrExtractedItem {
  codigo?: string | null;
  descricao: string;
  quantidade: number | null;
  unidade?: string | null;
  valorUnitario: number | null;
  valorTotal: number | null;
  desconto?: number | null;
  ncm?: string | null;
  cfop?: string | null;
  cstCsosn?: string | null;
  icms?: string | null;
  pis?: string | null;
  cofins?: string | null;
}

export interface OcrStoredItem {
  codigo?: string | null;
  descricao?: string;
  quantidade?: number | null;
  unidade?: string | null;
  valorUnitario?: number | null;
  valorTotal?: number | null;
  produto?: string;
  desconto?: number | null;
  ncm?: string | null;
  cfop?: string | null;
  cstCsosn?: string | null;
  icms?: string | null;
  pis?: string | null;
  cofins?: string | null;
}

export interface OcrEstablishmentFields {
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  endereco?: string | null;
  cidadeUf?: string | null;
}

export interface OcrDocumentFields {
  tipo?: string | null;
  numero?: string | null;
  serie?: string | null;
  data?: string | null;
  hora?: string | null;
  chaveAcesso?: string | null;
  protocolo?: string | null;
  numeroSat?: string | null;
  qrCode?: string | null;
}

export interface OcrValueFields {
  subtotal?: number | string | null;
  descontos?: number | string | null;
  acrescimos?: number | string | null;
  total?: number | string | null;
  formaPagamento?: string | null;
  valorPago?: number | string | null;
  troco?: number | string | null;
}

export interface OcrFiscalFields {
  ncm?: string | null;
  cfop?: string | null;
  cstCsosn?: string | null;
  icms?: string | null;
  pis?: string | null;
  cofins?: string | null;
}

export interface OcrExtractionFields {
  textoOriginal?: string;
  erro?: string;
  tipoDocumento?: OcrDocumentType | string | null;
  tipoDocumentoConfianca?: OcrExtractionConfidence | null;
  dadosOriginais?: Record<string, unknown>;
  estabelecimento?: OcrEstablishmentFields | null;
  documentoFiscal?: OcrDocumentFields | null;
  valores?: OcrValueFields | null;
  informacoesFiscais?: OcrFiscalFields | null;
  outrasInformacoes?: {
    observacoes?: string | null;
    informacoesComplementares?: string | null;
  } | null;
  camposExtras?: OcrExtraField[];
  cnpj?: string;
  nomeEstabelecimento?: string;
  nomeFantasia?: string;
  endereco?: string;
  cidadeUf?: string;
  data?: Date;
  hora?: string;
  valorTotal?: string;
  valorProdutos?: string;
  desconto?: string;
  tributos?: string;
  acrescimos?: string;
  valorPago?: string;
  troco?: string;
  numeroDocumento?: string;
  serie?: string;
  numeroSat?: string;
  qrCode?: string;
  inscricaoEstadual?: string;
  emitente?: string;
  destinatario?: string;
  formaPagamento?: string;
  protocoloAutorizacao?: string;
  chaveAcesso?: string;
  subtotal?: string;
  ncm?: string;
  cfop?: string;
  cstCsosn?: string;
  icms?: string;
  pis?: string;
  cofins?: string;
  observacoes?: string;
  informacoesComplementares?: string;
  itens?: OcrStoredItem[];
  confiancaExtracao?: OcrExtractionConfidence;
  alertaReconciliacao?: boolean;
  engine?: string;
  processingMs?: number;
  confidence?: number;
}

export type OcrExtractionResult =
  | { status: 'SUCESSO'; data: OcrExtractionFields }
  | { status: 'FALHA'; erro: string; data?: OcrExtractionFields };

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
  engine: string | null;
  processingMs: number | null;
  confidence: number | null;
  attempts: number;
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
  engine?: string | null;
  processingMs?: number | null;
  confidence?: number | null;
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
