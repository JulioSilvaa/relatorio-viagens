export interface CostCenterRecord {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface CostCentersRepository {
  findById(id: string): Promise<CostCenterRecord | null>;
  findActiveById(id: string): Promise<CostCenterRecord | null>;
  listAll(): Promise<CostCenterRecord[]>;
  listActive(): Promise<CostCenterRecord[]>;
  create(nome: string): Promise<CostCenterRecord>;
  update(id: string, data: { nome?: string; ativo?: boolean }): Promise<CostCenterRecord>;
}
