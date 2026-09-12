import type { DepartmentType, ReceiptType, TripStatus, UfType, VehicleType } from '@prisma/client';

export const TRIP_STATUSES = [
  'EM_ANDAMENTO',
  'EM_APROVACAO',
  'EM_CORRECAO',
  'APROVADA',
  'FINANCEIRO',
  'FINALIZADA',
  'CANCELADA',
] as const;

export type TripStatusValue = (typeof TRIP_STATUSES)[number];

export const EDITABLE_TRIP_STATUSES: readonly TripStatusValue[] = ['EM_ANDAMENTO', 'EM_CORRECAO'];

export const PARTICIPANT_EDITABLE_TRIP_STATUSES: readonly TripStatusValue[] = ['EM_ANDAMENTO'];

export interface CreateTripData {
  cliente: string;
  cidade: string;
  uf: UfType;
  dataSaida: Date;
  dataRetorno: Date;
  departamento: DepartmentType;
  motivo: string;
  veiculo?: string | null;
  placa?: string | null;
  tipoVeiculo?: VehicleType | null;
  kmInicial?: string | null;
  kmFinal?: string | null;
  centroDeCustoId?: string | null;
  observacoes?: string | null;
}

export interface UpdateTripData extends Partial<CreateTripData> {
  taxaKm?: string | null;
}

export interface TripUserRef {
  id: string;
  name: string;
}

export interface TripParticipantView {
  userId: string;
  name: string;
  addedAt: Date;
  cartaoLast4: string | null;
  cartaoBandeira: string | null;
}

export interface TripReceiptOcrView {
  status: string;
  origem: string;
  cnpj: string | null;
  nomeEstabelecimento: string | null;
  data: string | null;
  hora: string | null;
  valorTotal: string | null;
  numeroDocumento: string | null;
  chaveAcesso: string | null;
  itens: unknown[] | null;
  erro: string | null;
  extraidoEm: string | null;
  conferidoPor: { id: string; name: string } | null;
  conferidoEm: string | null;
}

export interface TripReceiptView {
  id: string;
  tipo: ReceiptType;
  fileName: string;
  fileType: string;
  fileSize: number;
  ativo: boolean;
  createdAt: Date;
  ocr: TripReceiptOcrView | null;
}

export interface TripExpenseView {
  id: string;
  category: { id: string; code: string; name: string };
  valor: string;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  criadoPor: TripUserRef;
  receipts: TripReceiptView[];
}

export interface TripView {
  id: string;
  cliente: string;
  cidade: string;
  uf: UfType;
  dataSaida: Date;
  dataRetorno: Date;
  departamento: DepartmentType;
  motivo: string;
  veiculo: string | null;
  placa: string | null;
  tipoVeiculo: VehicleType | null;
  kmInicial: string | null;
  kmFinal: string | null;
  taxaKm: string | null;
  centroDeCustoId: string | null;
  observacoes: string | null;
  status: TripStatus;
  motivoCancelamento: string | null;
  criadoPor: TripUserRef;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripDetailView extends TripView {
  participants: TripParticipantView[];
  despesas: TripExpenseView[];
  adiantamento: TripAdvanceView | null;
}

export interface TripAdvanceView {
  id: string;
  tripId: string;
  status: AdvanceStatusValue;
  solicitadoPor: TripUserRef;
  valorSolicitado: string;
  justificativaSolicitacao: string;
  valorAprovado: string | null;
  aprovadoPor: TripUserRef | null;
  aprovadoEm: Date | null;
  justificativaAnalise: string | null;
  pagoPor: TripUserRef | null;
  pagoEm: Date | null;
  observacoesPagamento: string | null;
  solicitadoEm: Date;
  atualizadoEm: Date;
}

export type AdvanceStatusValue =
  | 'SOLICITADO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'RECUSADO'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGO';
