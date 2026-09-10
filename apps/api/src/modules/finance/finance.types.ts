export type AdvanceStatusValue =
  | 'SOLICITADO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'RECUSADO'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGO';

export interface PaymentComprovante {
  data: Uint8Array;
  nome: string;
  tipo: string;
  tamanho: number;
}

export interface TripPaymentRecord {
  id: string;
  tripId: string;
  valor: string;
  dataPagamento: Date;
  observacoes: string | null;
  responsavel: { id: string; name: string };
  comprovanteNome: string | null;
  createdAt: Date;
}

export interface TripAdvanceRecord {
  id: string;
  tripId: string;
  status: AdvanceStatusValue;
  solicitadoPor: { id: string; name: string };
  valorSolicitado: string;
  justificativaSolicitacao: string;
  valorAprovado: string | null;
  aprovadoPor: { id: string; name: string } | null;
  aprovadoEm: Date | null;
  justificativaAnalise: string | null;
  pagoPor: { id: string; name: string } | null;
  pagoEm: Date | null;
  observacoesPagamento: string | null;
  solicitadoEm: Date;
  atualizadoEm: Date;
}

export interface TripRefundRecord {
  id: string;
  tripId: string;
  valor: string;
  data: Date;
  metodoDePagamento: string;
  observacoes: string | null;
  comprovanteNome: string | null;
  registradoPor: { id: string; name: string };
  createdAt: Date;
}

export interface RegisterPaymentInput {
  tripId: string;
  valor: string;
  dataPagamento: Date;
  observacoes: string | null;
  responsavelId: string;
  comprovante: PaymentComprovante | null;
}

export interface RegisterRefundInput {
  tripId: string;
  valor: string;
  data: Date;
  metodoDePagamento: string;
  observacoes: string | null;
  comprovante: PaymentComprovante | null;
  registradoPorId: string;
}

export interface RequestAdvanceInput {
  tripId: string;
  valorSolicitado: string;
  justificativaSolicitacao: string;
  solicitadoPorId: string;
}

export interface AdvanceAnalysisInput {
  advanceId: string;
  aprovado: boolean;
  valorAprovado: string | null;
  justificativaAnalise: string;
  aprovadoPorId: string;
  aprovadoEm: Date;
}

export interface AdvancePaymentInput {
  advanceId: string;
  observacoesPagamento: string | null;
  pagoPorId: string;
  pagoEm: Date;
}

export interface TripFinanceData {
  payments: TripPaymentRecord[];
  advances: TripAdvanceRecord[];
  refunds: TripRefundRecord[];
}

export interface FinanceRepository {
  registerPayment(input: RegisterPaymentInput): Promise<TripPaymentRecord>;
  createAdvanceRequest(input: RequestAdvanceInput): Promise<TripAdvanceRecord>;
  findLatestAdvanceByTrip(tripId: string): Promise<TripAdvanceRecord | null>;
  findAdvanceById(id: string): Promise<TripAdvanceRecord | null>;
  analyzeAdvance(input: AdvanceAnalysisInput): Promise<TripAdvanceRecord>;
  payAdvance(input: AdvancePaymentInput): Promise<TripAdvanceRecord>;
  registerRefund(input: RegisterRefundInput): Promise<TripRefundRecord>;
  listByTrip(tripId: string): Promise<TripFinanceData>;
}
