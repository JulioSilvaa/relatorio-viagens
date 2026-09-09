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
    filters: ManagerReportFilters,
  ): Promise<DashboardManagerReport> {
    if (!canViewGlobal) {
      throw new DashboardForbiddenError();
    }
    return this.repository.managerReport(filters);
  }
}
