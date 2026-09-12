export interface ReportTripData {
  id: string;
  cliente: string;
  cidade: string;
  uf: string;
  dataSaida: Date;
  dataRetorno: Date;
  departamento: string;
  motivo: string;
  veiculo: string | null;
  placa: string | null;
  tipoVeiculo: string | null;
  kmInicial: string | null;
  kmFinal: string | null;
  taxaKm: string | null;
  centroDeCusto: string | null;
  observacoes: string | null;
  status: string;
}

export interface ReportExpenseRow {
  id: string;
  categoria: string;
  dataDespesa: Date;
  valor: string;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  autor: string;
  comprovantes: number;
}

export interface ReportFinanceRecord {
  id: string;
  valor: string;
  data: Date;
  responsavel: string;
  observacoes: string | null;
  comprovanteNome: string | null;
}

export interface ReportOcrSummary {
  totalComprovantes: number;
  comOcr: number;
  manual: number;
  pendentes: number;
  falhas: number;
  valorExtraidoTotal: string;
  chavesAcesso: string[];
}

export interface ReportOcrFieldSet {
  textoOriginal: string | null;
  tipoDocumento: string | null;
  tipoDocumentoConfianca: 'alta' | 'media' | 'baixa' | null;
  endereco: string | null;
  cnpj: string | null;
  nomeEstabelecimento: string | null;
  nomeFantasia: string | null;
  cidadeUf: string | null;
  data: string | null;
  hora: string | null;
  valorTotal: string | null;
  valorProdutos: string | null;
  desconto: string | null;
  tributos: string | null;
  acrescimos: string | null;
  valorPago: string | null;
  troco: string | null;
  numeroDocumento: string | null;
  serie: string | null;
  numeroSat: string | null;
  qrCode: string | null;
  inscricaoEstadual: string | null;
  emitente: string | null;
  destinatario: string | null;
  formaPagamento: string | null;
  protocoloAutorizacao: string | null;
  chaveAcesso: string | null;
  subtotal: string | null;
  ncm: string | null;
  cfop: string | null;
  cstCsosn: string | null;
  icms: string | null;
  pis: string | null;
  cofins: string | null;
  observacoes: string | null;
  informacoesComplementares: string | null;
  camposExtras: Array<{
    secao: string | null;
    label: string;
    valor: string | null;
    confianca: 'alta' | 'media' | 'baixa' | null;
  }>;
  itens: Array<{
    codigo: string | null;
    descricao: string;
    quantidade: number | null;
    unidade: string | null;
    valorUnitario: number | null;
    desconto: number | null;
    valorTotal: number | null;
    ncm: string | null;
    cfop: string | null;
    cstCsosn: string | null;
    icms: string | null;
    pis: string | null;
    cofins: string | null;
  }>;
  confiancaExtracao: 'alta' | 'media' | 'baixa' | null;
  alertaReconciliacao: boolean;
  erro: string | null;
}

export interface ReportOcrReceipt {
  receiptId: string;
  fileHash: string;
  fileName: string;
  categoria: string;
  status: string;
  origem: string;
  extraidoEm: Date | null;
  conferidoEm: Date | null;
  structured: ReportOcrFieldSet;
  original: ReportOcrFieldSet | null;
  final: ReportOcrFieldSet;
}

export interface ReportData {
  trip: ReportTripData;
  participantes: Array<{
    id: string;
    nome: string;
    cartaoLast4: string | null;
    cartaoBandeira: string | null;
  }>;
  despesas: ReportExpenseRow[];
  totalDespesas: string;
  totalReembolsavel: string;
  financeiro: {
    adiantamentos: ReportFinanceRecord[];
    reembolsos: ReportFinanceRecord[];
    devolucoes: ReportFinanceRecord[];
    totalAdiantamentos: string;
    totalReembolsos: string;
    totalDevolucoes: string;
  };
  ocr: ReportOcrSummary;
  ocrDetalhes: ReportOcrReceipt[];
  versao: number;
  emitidoEm: Date;
  emitidoPor: string;
}

export type PdfAttachment = {
  receiptId: string;
  fileHash: string;
  fileName: string;
  data: Uint8Array;
};

export interface GeneratedOfficialReport {
  data: ReportData;
  fileName: string;
  content: Buffer;
}

export interface ReportsRepository {
  getReportData(tripId: string, emitidoPor: string): Promise<ReportData>;
  listImageReceipts(tripId: string): Promise<PdfAttachment[]>;
}
