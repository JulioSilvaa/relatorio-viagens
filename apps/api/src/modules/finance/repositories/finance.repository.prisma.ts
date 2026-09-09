import { prisma } from '../../../config/database.js';
import type {
  FinanceRepository,
  RegisterAdvanceInput,
  RegisterPaymentInput,
  RegisterRefundInput,
  TripAdvanceRecord,
  TripFinanceData,
  TripPaymentRecord,
  TripRefundRecord,
} from '../finance.types.js';

const PAYMENT_INCLUDE = { responsavel: { select: { id: true, name: true } } } as const;
const ADVANCE_INCLUDE = { registradoPor: { select: { id: true, name: true } } } as const;
const REFUND_INCLUDE = { registradoPor: { select: { id: true, name: true } } } as const;

function toPayment(row: {
  id: string;
  tripId: string;
  valor: { toString(): string };
  dataPagamento: Date;
  observacoes: string | null;
  comprovanteNome: string | null;
  responsavel: { id: string; name: string };
  createdAt: Date;
}): TripPaymentRecord {
  return {
    id: row.id,
    tripId: row.tripId,
    valor: row.valor.toString(),
    dataPagamento: row.dataPagamento,
    observacoes: row.observacoes,
    responsavel: row.responsavel,
    comprovanteNome: row.comprovanteNome,
    createdAt: row.createdAt,
  };
}

function toAdvance(row: {
  id: string;
  tripId: string;
  valor: { toString(): string };
  data: Date;
  observacoes: string | null;
  registradoPor: { id: string; name: string };
  createdAt: Date;
}): TripAdvanceRecord {
  return {
    id: row.id,
    tripId: row.tripId,
    valor: row.valor.toString(),
    data: row.data,
    observacoes: row.observacoes,
    registradoPor: row.registradoPor,
    createdAt: row.createdAt,
  };
}

function toRefund(row: {
  id: string;
  tripId: string;
  valor: { toString(): string };
  data: Date;
  metodoDePagamento: string;
  observacoes: string | null;
  comprovanteNome: string | null;
  registradoPor: { id: string; name: string };
  createdAt: Date;
}): TripRefundRecord {
  return {
    id: row.id,
    tripId: row.tripId,
    valor: row.valor.toString(),
    data: row.data,
    metodoDePagamento: row.metodoDePagamento,
    observacoes: row.observacoes,
    comprovanteNome: row.comprovanteNome,
    registradoPor: row.registradoPor,
    createdAt: row.createdAt,
  };
}

export class PrismaFinanceRepository implements FinanceRepository {
  async registerPayment(input: RegisterPaymentInput): Promise<TripPaymentRecord> {
    const row = await prisma.tripPayment.create({
      data: {
        tripId: input.tripId,
        valor: input.valor,
        dataPagamento: input.dataPagamento,
        observacoes: input.observacoes,
        responsavelId: input.responsavelId,
        comprovanteData: input.comprovante?.data ?? null,
        comprovanteNome: input.comprovante?.nome ?? null,
        comprovanteTipo: input.comprovante?.tipo ?? null,
        comprovanteTamanho: input.comprovante?.tamanho ?? null,
      },
      include: PAYMENT_INCLUDE,
    });
    return toPayment(row);
  }

  async registerAdvance(input: RegisterAdvanceInput): Promise<TripAdvanceRecord> {
    const row = await prisma.tripAdvance.create({
      data: {
        tripId: input.tripId,
        valor: input.valor,
        data: input.data,
        observacoes: input.observacoes,
        registradoPorId: input.registradoPorId,
      },
      include: ADVANCE_INCLUDE,
    });
    return toAdvance(row);
  }

  async registerRefund(input: RegisterRefundInput): Promise<TripRefundRecord> {
    const row = await prisma.tripRefund.create({
      data: {
        tripId: input.tripId,
        valor: input.valor,
        data: input.data,
        metodoDePagamento: input.metodoDePagamento,
        observacoes: input.observacoes,
        comprovanteData: input.comprovante?.data ?? null,
        comprovanteNome: input.comprovante?.nome ?? null,
        comprovanteTipo: input.comprovante?.tipo ?? null,
        comprovanteTamanho: input.comprovante?.tamanho ?? null,
        registradoPorId: input.registradoPorId,
      },
      include: REFUND_INCLUDE,
    });
    return toRefund(row);
  }

  async listByTrip(tripId: string): Promise<TripFinanceData> {
    const [payments, advances, refunds] = await Promise.all([
      prisma.tripPayment.findMany({
        where: { tripId },
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tripAdvance.findMany({
        where: { tripId },
        include: ADVANCE_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tripRefund.findMany({
        where: { tripId },
        include: REFUND_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      payments: payments.map(toPayment),
      advances: advances.map(toAdvance),
      refunds: refunds.map(toRefund),
    };
  }
}
