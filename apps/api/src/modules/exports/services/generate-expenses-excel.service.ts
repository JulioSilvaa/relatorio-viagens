import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type { ExcelExpenseFilters, ExportsRepository, GeneratedExcel } from '../excel.types.js';

export class GenerateExpensesExcelService {
  constructor(private readonly repository: ExportsRepository) {}

  async execute(
    isGlobal: boolean,
    actorId: string,
    actorCompanyId: string | null,
    filters: ExcelExpenseFilters,
  ): Promise<GeneratedExcel> {
    if (!actorCompanyId) throw new TenantRequiredError();
    return this.repository.buildExpensesExcel(filters, {
      global: isGlobal,
      userId: actorId,
      companyId: actorCompanyId,
    });
  }
}
