import type { AuditService } from '../../../modules/audit/audit.service.js';
import type {
  CostCenterRecord,
  CostCentersRepository,
} from '../repositories/cost-centers.repository.js';

export interface UpdateCostCenterInput {
  nome?: string;
  ativo?: boolean;
}

export class UpdateCostCenterService {
  constructor(
    private readonly costCenters: CostCentersRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateCostCenterInput,
    actorId: string,
  ): Promise<CostCenterRecord> {
    const previous = await this.costCenters.findById(id);
    const center = await this.costCenters.update(id, {
      nome: dto.nome?.trim(),
      ativo: dto.ativo,
    });

    for (const field of Object.keys(dto) as (keyof UpdateCostCenterInput)[]) {
      const oldValue = field === 'nome' ? previous?.nome : String(previous?.ativo);
      const newValue = field === 'nome' ? center.nome : String(center.ativo);
      if (oldValue !== newValue) {
        await this.audit.record({
          userId: actorId,
          operation: 'ALTERAR',
          entityType: 'COST_CENTER',
          entityId: id,
          field,
          oldValue,
          newValue,
        });
      }
    }

    return center;
  }
}
