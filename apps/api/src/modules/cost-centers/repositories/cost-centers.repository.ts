export interface CostCenterRecord {
  id: string;
  companyId: string;
  nome: string;
  ativo: boolean;
}

export interface CostCentersRepository {
  findById(id: string, companyId: string): Promise<CostCenterRecord | null>;
  findActiveById(id: string, companyId: string): Promise<CostCenterRecord | null>;
  listAll(companyId: string): Promise<CostCenterRecord[]>;
  listActive(companyId: string): Promise<CostCenterRecord[]>;
  create(nome: string, companyId: string): Promise<CostCenterRecord>;
  update(
    id: string,
    data: { nome?: string; ativo?: boolean },
    companyId: string,
  ): Promise<CostCenterRecord>;
}
