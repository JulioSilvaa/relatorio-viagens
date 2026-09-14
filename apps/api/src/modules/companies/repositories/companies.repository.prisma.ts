import { prisma } from '../../../config/database.js';
import { Prisma } from '@prisma/client';
import { CnpjAlreadyUsedError } from '../errors/company.errors.js';
import type { CompaniesRepository, CompanyRecord } from './companies.repository.js';

const COMPANY_SELECT = {
  id: true,
  name: true,
  cnpj: true,
} as const;

export class PrismaCompaniesRepository implements CompaniesRepository {
  async findByCnpj(cnpj: string): Promise<CompanyRecord | null> {
    const company = await prisma.company.findUnique({
      where: { cnpj },
      select: COMPANY_SELECT,
    });
    return company ?? null;
  }

  async create(data: { name: string; cnpj: string }): Promise<CompanyRecord> {
    try {
      const company = await prisma.company.create({
        data: { name: data.name, cnpj: data.cnpj },
        select: COMPANY_SELECT,
      });
      return company;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CnpjAlreadyUsedError();
      }
      throw error;
    }
  }
}
