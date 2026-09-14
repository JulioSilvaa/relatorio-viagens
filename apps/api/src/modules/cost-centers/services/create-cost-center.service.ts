import type { AuditService } from '../../../modules/audit/audit.service.js';
import { TenantRequiredError } from '../../../shared/errors/tenant.errors.js';
import type {
  CostCenterRecord,
  CostCentersRepository,
} from '../repositories/cost-centers.repository.js';

export class CreateCostCenterService {
  constructor(
    private readonly costCenters: CostCentersRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    nome: string,
    actorId: string,
    actorCompanyId: string | null,
  ): Promise<CostCenterRecord> {
    if (!actorCompanyId) throw new TenantRequiredError();
    const center = await this.costCenters.create(nome.trim(), actorCompanyId);

    await this.audit.record({
      userId: actorId,
      operation: 'CRIAR',
      entityType: 'COST_CENTER',
      entityId: center.id,
      newValue: center.nome,
    });

    return center;
  }
}
