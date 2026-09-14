import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import { CostCenterConfigNotFoundError, CostCenterExistsError } from '../cost-center.errors.js';
import type { CostCenterRecord, CostCentersRepository } from './cost-centers.repository.js';

function toRecord(center: {
  id: string;
  companyId: string;
  nome: string;
  ativo: boolean;
}): CostCenterRecord {
  return { id: center.id, companyId: center.companyId, nome: center.nome, ativo: center.ativo };
}

export class PrismaCostCentersRepository implements CostCentersRepository {
  async findById(id: string, companyId: string): Promise<CostCenterRecord | null> {
    const center = await prisma.costCenter.findFirst({ where: { id, companyId } });
    return center ? toRecord(center) : null;
  }

  async findActiveById(id: string, companyId: string): Promise<CostCenterRecord | null> {
    const center = await prisma.costCenter.findFirst({ where: { id, companyId, ativo: true } });
    return center ? toRecord(center) : null;
  }

  async listAll(companyId: string): Promise<CostCenterRecord[]> {
    const centers = await prisma.costCenter.findMany({
      where: { companyId },
      orderBy: { nome: 'asc' },
    });
    return centers.map(toRecord);
  }

  async listActive(companyId: string): Promise<CostCenterRecord[]> {
    const centers = await prisma.costCenter.findMany({
      where: { companyId, ativo: true },
      orderBy: { nome: 'asc' },
    });
    return centers.map(toRecord);
  }

  async create(nome: string, companyId: string): Promise<CostCenterRecord> {
    try {
      const center = await prisma.costCenter.create({ data: { nome, companyId } });
      return toRecord(center);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CostCenterExistsError();
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: { nome?: string; ativo?: boolean },
    companyId: string,
  ): Promise<CostCenterRecord> {
    const current = await prisma.costCenter.findFirst({ where: { id, companyId } });
    if (!current) throw new CostCenterConfigNotFoundError();
    try {
      const center = await prisma.costCenter.update({
        where: { id },
        data,
      });
      return toRecord(center);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CostCenterExistsError();
      }
      throw error;
    }
  }
}
