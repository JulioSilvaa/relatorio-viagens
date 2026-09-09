import type { ExcelExpenseFilters, ExportsRepository, GeneratedExcel } from '../excel.types.js';

export class GenerateExpensesExcelService {
  constructor(private readonly repository: ExportsRepository) {}

  async execute(
    isGlobal: boolean,
    actorId: string,
    filters: ExcelExpenseFilters,
  ): Promise<GeneratedExcel> {
    return this.repository.buildExpensesExcel(filters, {
      global: isGlobal,
      userId: actorId,
    });
  }
}
