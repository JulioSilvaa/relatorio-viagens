import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import { toAdvanceRecord } from '../../finance/advance.mapper.js';
import {
  TripNotFoundError,
  TripParticipantExistsError,
  TripParticipantNotFoundError,
} from '../trip.errors.js';
import type {
  CreateTripInput,
  ExpenseDetailRecord,
  TripCreatorRef,
  TripDetailRecord,
  TripParticipantRecord,
  TripRecord,
  TripSearchInput,
  TripSearchResult,
  TripsRepository,
} from './trips.repository.js';

interface PrismaTripRow {
  id: string;
  cliente: string;
  cidade: string;
  uf: string;
  dataSaida: Date;
  dataRetorno: Date;
  departamento: string;
  motivo: string;
  veiculo: string | null;
  placa: string | null;
  tipoVeiculo: string | null;
  kmInicial: Prisma.Decimal | null;
  kmFinal: Prisma.Decimal | null;
  taxaKm: Prisma.Decimal | null;
  centroDeCustoId: string | null;
  observacoes: string | null;
  status: string;
  motivoCancelamento: string | null;
  criadoPorId: string;
  deletadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DETAIL_INCLUDE = {
  criadoPor: { select: { id: true, name: true } },
  participants: {
    include: {
      user: { select: { id: true, name: true } },
      creditCard: { select: { last4: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  expenses: {
    where: { deletedAt: null },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      receipts: {
        include: {
          ReceiptOcr: {
            include: { conferidoPor: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  advances: {
    orderBy: { solicitadoEm: 'desc' as const },
    take: 1,
    include: {
      solicitadoPor: { select: { id: true, name: true } },
      aprovadoPor: { select: { id: true, name: true } },
      pagoPor: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TripInclude;

type TripDetailPayload = Prisma.TripGetPayload<{ include: typeof DETAIL_INCLUDE }>;
type PrismaExpenseRow = TripDetailPayload['expenses'][number];

function toTripRecord(trip: PrismaTripRow, criadoPor: TripCreatorRef): TripRecord {
  return {
    id: trip.id,
    cliente: trip.cliente,
    cidade: trip.cidade,
    uf: trip.uf as TripRecord['uf'],
    dataSaida: trip.dataSaida,
    dataRetorno: trip.dataRetorno,
    departamento: trip.departamento as TripRecord['departamento'],
    motivo: trip.motivo,
    veiculo: trip.veiculo,
    placa: trip.placa,
    tipoVeiculo: trip.tipoVeiculo as TripRecord['tipoVeiculo'],
    kmInicial: trip.kmInicial ? trip.kmInicial.toString() : null,
    kmFinal: trip.kmFinal ? trip.kmFinal.toString() : null,
    taxaKm: trip.taxaKm ? trip.taxaKm.toString() : null,
    centroDeCustoId: trip.centroDeCustoId,
    observacoes: trip.observacoes,
    status: trip.status as TripRecord['status'],
    motivoCancelamento: trip.motivoCancelamento,
    criadoPorId: trip.criadoPorId,
    deletadoEm: trip.deletadoEm,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
    criadoPor,
  };
}

function toExpenseDetail(expense: PrismaExpenseRow): ExpenseDetailRecord {
  return {
    id: expense.id,
    category: {
      id: expense.category.id,
      code: expense.category.code,
      name: expense.category.name,
    },
    valor: expense.valor.toString(),
    dataDespesa: expense.dataDespesa,
    reembolsavel: expense.reembolsavel,
    justificativa: expense.justificativa,
    alertaExcesso: expense.alertaExcesso ? expense.alertaExcesso.toString() : null,
    deletedAt: expense.deletedAt,
    criadoPor: { id: expense.createdBy.id, name: expense.createdBy.name },
    receipts: expense.receipts.map((receipt) => ({
      id: receipt.id,
      tipo: receipt.tipo,
      fileName: receipt.fileName,
      fileType: receipt.fileType,
      fileSize: receipt.fileSize,
      ativo: receipt.ativo,
      createdAt: receipt.createdAt,
      ocr: receipt.ReceiptOcr
        ? {
            status: receipt.ReceiptOcr.status,
            origem: receipt.ReceiptOcr.origem,
            cnpj: receipt.ReceiptOcr.cnpj,
            nomeEstabelecimento: receipt.ReceiptOcr.nomeEstabelecimento,
            data: receipt.ReceiptOcr.data,
            hora: receipt.ReceiptOcr.hora,
            valorTotal: receipt.ReceiptOcr.valorTotal?.toString() ?? null,
            numeroDocumento: receipt.ReceiptOcr.numeroDocumento,
            chaveAcesso: receipt.ReceiptOcr.chaveAcesso,
            itens: (receipt.ReceiptOcr.itens as unknown[]) ?? null,
            erro: receipt.ReceiptOcr.erro,
            extraidoEm: receipt.ReceiptOcr.extraidoEm,
            conferidoPor: receipt.ReceiptOcr.conferidoPor
              ? {
                  id: receipt.ReceiptOcr.conferidoPor.id,
                  name: receipt.ReceiptOcr.conferidoPor.name,
                }
              : null,
            conferidoEm: receipt.ReceiptOcr.conferidoEm,
          }
        : null,
    })),
  };
}

function toDetailRecord(
  trip: PrismaTripRow,
  criadoPor: TripCreatorRef,
  participants: TripParticipantRecord[],
  expenses: ExpenseDetailRecord[],
  adiantamento: TripDetailPayload['advances'][number] | null,
): TripDetailRecord {
  return {
    ...toTripRecord(trip, criadoPor),
    participants,
    expenses,
    adiantamento: adiantamento ? toAdvanceRecord(adiantamento) : null,
  };
}

export class PrismaTripsRepository implements TripsRepository {
  async createTrip(input: CreateTripInput): Promise<TripRecord> {
    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          cliente: input.cliente,
          cidade: input.cidade,
          uf: input.uf,
          dataSaida: input.dataSaida,
          dataRetorno: input.dataRetorno,
          departamento: input.departamento,
          motivo: input.motivo,
          veiculo: input.veiculo ?? null,
          placa: input.placa ?? null,
          tipoVeiculo: input.tipoVeiculo ?? null,
          kmInicial: input.kmInicial ?? null,
          kmFinal: input.kmFinal ?? null,
          taxaKm: input.taxaKm ?? null,
          centroDeCustoId: input.centroDeCustoId ?? null,
          observacoes: input.observacoes ?? null,
          status: 'EM_ANDAMENTO',
          criadoPorId: input.criadoPorId,
        },
      });
      await tx.tripParticipant.create({
        data: { tripId: created.id, userId: input.criadoPorId, addedById: input.criadoPorId },
      });
      return created;
    });
    return toTripRecord(trip, { id: input.criadoPorId, name: input.criadoPorNome });
  }

  async findById(id: string): Promise<TripRecord | null> {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
    return trip ? toTripRecord(trip, trip.criadoPor) : null;
  }

  async findDetailById(id: string): Promise<TripDetailRecord | null> {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!trip) return null;

    const participants: TripParticipantRecord[] = trip.participants.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      addedAt: p.createdAt,
      cartaoLast4: p.creditCard?.last4 ?? null,
    }));

    const expenses = trip.expenses.map(toExpenseDetail);
    return toDetailRecord(trip, trip.criadoPor, participants, expenses, trip.advances[0] ?? null);
  }

  async findByParticipant(userId: string): Promise<TripRecord[]> {
    const trips = await prisma.trip.findMany({
      where: {
        deletadoEm: null,
        participants: { some: { userId } },
      },
      include: { criadoPor: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map((trip) => toTripRecord(trip, trip.criadoPor));
  }

  async findAll(): Promise<TripRecord[]> {
    const trips = await prisma.trip.findMany({
      where: { deletadoEm: null },
      include: { criadoPor: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map((trip) => toTripRecord(trip, trip.criadoPor));
  }

  async update(id: string, data: Record<string, unknown>): Promise<TripRecord> {
    try {
      const trip = await prisma.trip.update({
        where: { id },
        data,
        include: { criadoPor: { select: { id: true, name: true } } },
      });
      return toTripRecord(trip, trip.criadoPor);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new TripNotFoundError();
      }
      throw error;
    }
  }

  async setStatus(
    id: string,
    status: TripRecord['status'],
    motivoCancelamento?: string,
  ): Promise<void> {
    await prisma.trip.update({ where: { id }, data: { status, motivoCancelamento } });
  }

  async softDelete(id: string, deletedById: string): Promise<void> {
    await prisma.trip.update({
      where: { id },
      data: { deletadoEm: new Date(), deletadoPorId: deletedById },
    });
  }

  async addParticipant(
    tripId: string,
    userId: string,
    addedById: string,
  ): Promise<TripParticipantRecord> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TripParticipantNotFoundError();
    }
    let created;
    try {
      created = await prisma.tripParticipant.create({ data: { tripId, userId, addedById } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new TripParticipantExistsError();
      }
      throw error;
    }
    return { userId: user.id, name: user.name, addedAt: created.createdAt, cartaoLast4: null };
  }

  async removeParticipant(tripId: string, userId: string): Promise<boolean> {
    const result = await prisma.tripParticipant.deleteMany({ where: { tripId, userId } });
    return result.count > 0;
  }

  async participantExists(tripId: string, userId: string): Promise<boolean> {
    const count = await prisma.tripParticipant.count({ where: { tripId, userId } });
    return count > 0;
  }

  async listParticipants(tripId: string): Promise<TripParticipantRecord[]> {
    const rows = await prisma.tripParticipant.findMany({
      where: { tripId },
      include: {
        user: { select: { id: true, name: true } },
        creditCard: { select: { last4: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      userId: row.user.id,
      name: row.user.name,
      addedAt: row.createdAt,
      cartaoLast4: row.creditCard?.last4 ?? null,
    }));
  }

  async listParticipantIds(tripId: string): Promise<string[]> {
    const rows = await prisma.tripParticipant.findMany({
      where: { tripId },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  async searchTrips(input: TripSearchInput): Promise<TripSearchResult> {
    const { filters } = input;
    const where: Prisma.TripWhereInput = { deletadoEm: null };

    const scope: Prisma.TripWhereInput[] = [];
    if (!input.global) {
      scope.push({
        OR: [{ criadoPorId: input.userId }, { participants: { some: { userId: input.userId } } }],
      });
    }
    if (filters.id) scope.push({ id: filters.id });
    if (filters.dataDe || filters.dataAte) {
      scope.push({
        dataSaida: {
          ...(filters.dataDe ? { gte: new Date(filters.dataDe) } : {}),
          ...(filters.dataAte ? { lte: new Date(filters.dataAte) } : {}),
        },
      });
    }
    if (filters.cliente)
      scope.push({ cliente: { contains: filters.cliente, mode: 'insensitive' } });
    if (filters.cidade) scope.push({ cidade: { contains: filters.cidade, mode: 'insensitive' } });
    if (filters.status) scope.push({ status: filters.status as Prisma.TripWhereInput['status'] });
    if (filters.departamento) {
      scope.push({ departamento: filters.departamento as Prisma.TripWhereInput['departamento'] });
    }
    if (filters.centroDeCustoId) scope.push({ centroDeCustoId: filters.centroDeCustoId });
    if (filters.colaboradorId) {
      scope.push({
        OR: [
          { criadoPorId: filters.colaboradorId },
          { participants: { some: { userId: filters.colaboradorId } } },
        ],
      });
    }
    if (scope.length > 0) where.AND = scope;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: { criadoPor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      }),
      prisma.trip.count({ where }),
    ]);

    return {
      items: trips.map((trip) => toTripRecord(trip, trip.criadoPor)),
      total,
    };
  }
}
