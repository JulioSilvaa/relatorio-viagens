export interface CompanyRecord {
  id: string;
  name: string;
  cnpj: string;
}

export interface CompaniesRepository {
  findByCnpj(cnpj: string): Promise<CompanyRecord | null>;
  create(data: { name: string; cnpj: string }): Promise<CompanyRecord>;
}
