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

export interface ReportData {
  trip: ReportTripData;
  participantes: Array<{ id: string; nome: string }>;
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
  emitidoEm: Date;
  emitidoPor: string;
}

export type PdfAttachment = {
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
