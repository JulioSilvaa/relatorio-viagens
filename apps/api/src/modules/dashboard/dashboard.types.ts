export interface ManagerReportFilters {
  companyId: string;
  dataDe?: string;
  dataAte?: string;
  departamento?: string;
  categoriaCode?: string;
  status?: string;
  centroDeCustoId?: string;
  colaboradorId?: string;
  cidade?: string;
  cliente?: string;
}

export interface CategoryGroup {
  categoria: { code: string; name: string } | null;
  total: string;
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
  porCategoria: CategoryGroup[];
  porCidade: Array<{ cidade: string; total: string }>;
  porCentroDeCusto: Array<{ nome: string | null; total: string }>;
  evolucaoTemporal: Array<{ periodo: string; total: string }>;
  reembolsosStatus: Array<{ status: string; quantidade: number }>;
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

export interface DashboardRepository {
  managerReport(filters: ManagerReportFilters): Promise<DashboardManagerReport>;
  employeeReport(userId: string): Promise<DashboardEmployeeReport>;
}
