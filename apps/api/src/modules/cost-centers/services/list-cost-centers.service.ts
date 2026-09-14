import type {
  CostCenterRecord,
  CostCentersRepository,
} from '../repositories/cost-centers.repository.js';

export class ListCostCentersService {
  constructor(private readonly costCenters: CostCentersRepository) {}

  async execute(includeInactive: boolean, companyId: string | null): Promise<CostCenterRecord[]> {
    if (!companyId) return [];
    return includeInactive
      ? this.costCenters.listAll(companyId)
      : this.costCenters.listActive(companyId);
  }
}
