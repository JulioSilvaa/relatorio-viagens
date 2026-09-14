import { DashboardForbiddenError } from '../dashboard.errors.js';
import type {
  DashboardManagerReport,
  DashboardRepository,
  ManagerReportFilters,
} from '../dashboard.types.js';

export class ManagerDashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(
    canViewGlobal: boolean,
    filters: Omit<ManagerReportFilters, 'companyId'>,
    actorCompanyId: string | null,
  ): Promise<DashboardManagerReport> {
    if (!canViewGlobal || !actorCompanyId) {
      throw new DashboardForbiddenError();
    }
    return this.repository.managerReport({ ...filters, companyId: actorCompanyId });
  }
}
