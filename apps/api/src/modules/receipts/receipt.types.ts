import type { ReceiptType } from '@prisma/client';
import type { TripStatus } from '@prisma/client';

export interface ReceiptInsertData {
  fileData: Uint8Array;
  fileType: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  tipo: ReceiptType;
  uploadedById: string;
}

export interface ReceiptRecord {
  id: string;
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash: string;
  tipo: ReceiptType;
  ativo: boolean;
  uploadedById: string;
  createdAt: Date;
}

export interface ReceiptContext {
  id: string;
  expenseId: string;
  ativo: boolean;
  fileName: string;
  fileType: string;
  fileData: Uint8Array;
  expense: {
    id: string;
    createdById: string;
    trip: { id: string; status: TripStatus; deletadoEm: Date | null };
  };
}

export interface ReceiptsRepository {
  createReceipts(expenseId: string, data: ReceiptInsertData[]): Promise<ReceiptRecord[]>;
  findById(id: string): Promise<ReceiptContext | null>;
  setActive(id: string, ativo: boolean): Promise<void>;
}
