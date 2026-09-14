import { prisma } from '../../config/database.js';
import type {
  ReceiptContext,
  ReceiptInsertData,
  ReceiptRecord,
  ReceiptsRepository,
} from './receipt.types.js';

function toRecord(receipt: {
  id: string;
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash: string;
  tipo: string;
  ativo: boolean;
  uploadedById: string;
  createdAt: Date;
}): ReceiptRecord {
  return {
    id: receipt.id,
    expenseId: receipt.expenseId,
    fileName: receipt.fileName,
    fileType: receipt.fileType,
    fileSize: receipt.fileSize,
    fileHash: receipt.fileHash,
    tipo: receipt.tipo as ReceiptRecord['tipo'],
    ativo: receipt.ativo,
    uploadedById: receipt.uploadedById,
    createdAt: receipt.createdAt,
  };
}

export class PrismaReceiptsRepository implements ReceiptsRepository {
  async createReceipts(expenseId: string, data: ReceiptInsertData[]): Promise<ReceiptRecord[]> {
    const created = await prisma.receipt.createManyAndReturn({
      data: data.map((item) => ({
        expenseId,
        fileData: item.fileData,
        fileType: item.fileType,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileHash: item.fileHash,
        tipo: item.tipo,
        uploadedById: item.uploadedById,
      })),
    });
    return created.map(toRecord);
  }

  async findById(id: string): Promise<ReceiptContext | null> {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        expense: {
          include: {
            trip: {
              select: { id: true, status: true, deletadoEm: true, companyId: true },
            },
          },
        },
      },
    });
    if (!receipt) return null;
    return {
      id: receipt.id,
      expenseId: receipt.expenseId,
      ativo: receipt.ativo,
      fileName: receipt.fileName,
      fileType: receipt.fileType,
      fileData: receipt.fileData,
      expense: {
        id: receipt.expense.id,
        createdById: receipt.expense.createdById,
        trip: {
          id: receipt.expense.trip.id,
          status: receipt.expense.trip.status,
          deletadoEm: receipt.expense.trip.deletadoEm,
          companyId: receipt.expense.trip.companyId,
        },
      },
    };
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await prisma.receipt.update({ where: { id }, data: { ativo } });
  }
}
