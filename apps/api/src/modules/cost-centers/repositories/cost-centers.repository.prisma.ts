import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import { CostCenterConfigNotFoundError, CostCenterExistsError } from '../cost-center.errors.js';
import type { CostCenterRecord, CostCentersRepository } from './cost-centers.repository.js';

export class PrismaCostCentersRepository implements CostCentersRepository {
  async findById(id: string): Promise<CostCenterRecord | null> {
    const center = await prisma.costCenter.findUnique({ where: { id } });
    return center ? { id: center.id, nome: center.nome, ativo: center.ativo } : null;
  }

  async findActiveById(id: string): Promise<CostCenterRecord | null> {
    const center = await prisma.costCenter.findFirst({ where: { id, ativo: true } });
    return center ? { id: center.id, nome: center.nome, ativo: center.ativo } : null;
  }

  async listAll(): Promise<CostCenterRecord[]> {
    const centers = await prisma.costCenter.findMany({
      orderBy: { nome: 'asc' },
    });
    return centers.map((center) => ({
      id: center.id,
      nome: center.nome,
      ativo: center.ativo,
    }));
  }

  async listActive(): Promise<CostCenterRecord[]> {
    const centers = await prisma.costCenter.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return centers.map((center) => ({
      id: center.id,
      nome: center.nome,
      ativo: center.ativo,
    }));
  }

  async create(nome: string): Promise<CostCenterRecord> {
    try {
      const center = await prisma.costCenter.create({ data: { nome } });
      return { id: center.id, nome: center.nome, ativo: center.ativo };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CostCenterExistsError();
      }
      throw error;
    }
  }

  async update(id: string, data: { nome?: string; ativo?: boolean }): Promise<CostCenterRecord> {
    try {
      const center = await prisma.costCenter.update({ where: { id }, data });
      return { id: center.id, nome: center.nome, ativo: center.ativo };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new CostCenterConfigNotFoundError();
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CostCenterExistsError();
      }
      throw error;
    }
  }
}
