export type RoleTypeValue = "MANAGER_ADMIN" | "EMPLOYEE" | "FINANCE" | "FISCAL";

export type DepartmentTypeValue =
  | "COMERCIAL"
  | "AGRO"
  | "OPERACIONAL"
  | "ADMINISTRATIVO";

export type UserStatus = "ATIVO" | "INATIVO";

export interface UserView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: DepartmentTypeValue;
  cargo: string;
  roleCode: RoleTypeValue;
  status: UserStatus;
}

export const TRIP_STATUSES = [
  "EM_ANDAMENTO",
  "EM_APROVACAO",
  "EM_CORRECAO",
  "APROVADA",
  "FINANCEIRO",
  "FINALIZADA",
  "CANCELADA",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export interface TripUserRef {
  id: string;
  name: string;
}

export interface TripView {
  id: string;
  cliente: string;
  cidade: string;
  uf: string;
  dataSaida: string;
  dataRetorno: string;
  departamento: DepartmentTypeValue;
  motivo: string;
  veiculo: string | null;
  placa: string | null;
  tipoVeiculo: string | null;
  kmInicial: string | null;
  kmFinal: string | null;
  taxaKm: string | null;
  centroDeCustoId: string | null;
  observacoes: string | null;
  status: TripStatus;
  motivoCancelamento: string | null;
  criadoPor: TripUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface TripParticipantView {
  userId: string;
  name: string;
  addedAt: string;
}

export interface TripReceiptView {
  id: string;
  tipo: ReceiptTypeValue;
  fileName: string;
  fileType: string;
  fileSize: number;
  ativo: boolean;
  createdAt: string;
}

export interface TripExpenseView {
  id: string;
  category: { id: string; code: string; name: string };
  valor: string;
  dataDespesa: string;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  criadoPor: TripUserRef;
  receipts: TripReceiptView[];
}

export const ADVANCE_STATUSES = [
  "SOLICITADO",
  "EM_ANALISE",
  "APROVADO",
  "RECUSADO",
  "PAGAMENTO_PENDENTE",
  "PAGO",
] as const;

export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number];

export interface TripAdvanceView {
  id: string;
  tripId: string;
  status: AdvanceStatus;
  solicitadoPor: TripUserRef;
  valorSolicitado: string;
  justificativaSolicitacao: string;
  valorAprovado: string | null;
  aprovadoPor: TripUserRef | null;
  aprovadoEm: string | null;
  justificativaAnalise: string | null;
  pagoPor: TripUserRef | null;
  pagoEm: string | null;
  observacoesPagamento: string | null;
  solicitadoEm: string;
  atualizadoEm: string;
}

export type ReceiptTypeValue =
  | "NOTA_FISCAL"
  | "CUPOM_FISCAL"
  | "NOTA_MANUAL"
  | "COMPROVANTE_CARTAO"
  | "OUTRO";

export const RECEIPT_TYPES: ReceiptTypeValue[] = [
  "NOTA_FISCAL",
  "CUPOM_FISCAL",
  "NOTA_MANUAL",
  "COMPROVANTE_CARTAO",
  "OUTRO",
];

export interface ExpenseCategoryView {
  id: string;
  code: string;
  name: string;
  ativa: boolean;
}

export interface TripDetailView extends TripView {
  participants: TripParticipantView[];
  despesas: TripExpenseView[];
  adiantamento: TripAdvanceView | null;
}

export interface TripSearchResult {
  itens: TripView[];
  total: number;
  limite: number;
  deslocamento: number;
}

export interface ManagerReportFilters {
  dataDe?: string;
  dataAte?: string;
  departamento?: string;
  categoria?: string;
  status?: string;
  centroDeCustoId?: string;
  colaboradorId?: string;
  cidade?: string;
  cliente?: string;
}

export interface DashboardAdvanceSummary {
  totalSolicitado: string;
  totalAprovado: string;
  totalPago: string;
  pendentesAnalise: number;
}

export interface DashboardManagerReport {
  periodoDe: string;
  periodoAte: string;
  totalDespesas: string;
  totalReembolsado: string;
  valoresPendentes: string;
  quantidadeViagens: number;
  relatoriosPendentes: number;
  adiantamentos: DashboardAdvanceSummary;
  porColaborador: Array<{ id: string; nome: string; total: string }>;
  porCategoria: Array<{
    categoria: { code: string; name: string } | null;
    total: string;
  }>;
  porCidade: Array<{ cidade: string; total: string }>;
  porCentroDeCusto: Array<{ nome: string | null; total: string }>;
  evolucaoTemporal: Array<{ periodo: string; total: string }>;
  reembolsosStatus: Array<{ status: TripStatus; quantidade: number }>;
  viagensPorDepartamento: Array<{ departamento: string; quantidade: number }>;
  viagensPorRegiao: Array<{ regiao: string; quantidade: number }>;
  cidadesMaisVisitadas: Array<{ cidade: string; uf: string; quantidade: number }>;
  viagensPorColaborador: Array<{ id: string; nome: string; quantidade: number }>;
}

export interface DashboardEmployeeReport {
  viagensEmAndamento: number;
  relatoriosAguardandoAprovacao: number;
  relatoriosEmCorrecao: number;
  reembolsosPendentes: number;
  relatoriosFinalizados: number;
  totalReembolsado: string;
}
