export interface ExcelExpenseFilters {
  dataDe?: string;
  dataAte?: string;
  cliente?: string;
  cidade?: string;
  colaboradorId?: string;
  status?: string;
  departamento?: string;
  centroDeCustoId?: string;
}

export interface GeneratedExcel {
  fileName: string;
  content: Buffer;
}

export interface ExportsRepository {
  buildExpensesExcel(
    filters: ExcelExpenseFilters,
    scope: { global: boolean; userId: string; companyId: string },
  ): Promise<GeneratedExcel>;
}
