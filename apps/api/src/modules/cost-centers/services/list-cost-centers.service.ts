import type {
  CostCenterRecord,
  CostCentersRepository,
} from '../repositories/cost-centers.repository.js';

export class ListCostCentersService {
  constructor(private readonly costCenters: CostCentersRepository) {}

  async execute(includeInactive: boolean): Promise<CostCenterRecord[]> {
    return includeInactive ? this.costCenters.listAll() : this.costCenters.listActive();
  }
}
