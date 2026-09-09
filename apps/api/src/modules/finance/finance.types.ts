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
  valor: string;
  data: Date;
  observacoes: string | null;
  registradoPor: { id: string; name: string };
  createdAt: Date;
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

export interface RegisterAdvanceInput {
  tripId: string;
  valor: string;
  data: Date;
  observacoes: string | null;
  registradoPorId: string;
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

export interface TripFinanceData {
  payments: TripPaymentRecord[];
  advances: TripAdvanceRecord[];
  refunds: TripRefundRecord[];
}

export interface FinanceRepository {
  registerPayment(input: RegisterPaymentInput): Promise<TripPaymentRecord>;
  registerAdvance(input: RegisterAdvanceInput): Promise<TripAdvanceRecord>;
  registerRefund(input: RegisterRefundInput): Promise<TripRefundRecord>;
  listByTrip(tripId: string): Promise<TripFinanceData>;
}
