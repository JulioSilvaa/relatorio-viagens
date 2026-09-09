import type { DashboardEmployeeReport, DashboardRepository } from '../dashboard.types.js';

export class EmployeeDashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(actorId: string): Promise<DashboardEmployeeReport> {
    return this.repository.employeeReport(actorId);
  }
}
