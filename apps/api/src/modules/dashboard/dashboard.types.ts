export interface ManagerReportFilters {
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

export interface DashboardManagerReport {
  periodoDe: string;
  periodoAte: string;
  totalDespesas: string;
  totalReembolsado: string;
  valoresPendentes: string;
  quantidadeViagens: number;
  relatoriosPendentes: number;
  porColaborador: Array<{ id: string; nome: string; total: string }>;
  porCategoria: CategoryGroup[];
  porCidade: Array<{ cidade: string; total: string }>;
  porCentroDeCusto: Array<{ nome: string | null; total: string }>;
  evolucaoTemporal: Array<{ periodo: string; total: string }>;
  reembolsosStatus: Array<{ status: string; quantidade: number }>;
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
