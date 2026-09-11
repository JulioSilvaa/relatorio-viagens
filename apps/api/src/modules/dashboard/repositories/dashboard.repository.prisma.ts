import type { DepartmentType, Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import type {
  DashboardEmployeeReport,
  DashboardManagerReport,
  DashboardRepository,
  ManagerReportFilters,
} from '../dashboard.types.js';

const EMPLOYEE_PAYMENT_WINDOW_DAYS = 30;

const REGIAO_BY_UF: Record<string, string> = {
  AC: 'Norte',
  AP: 'Norte',
  AM: 'Norte',
  PA: 'Norte',
  RO: 'Norte',
  RR: 'Norte',
  TO: 'Norte',
  MA: 'Nordeste',
  PI: 'Nordeste',
  CE: 'Nordeste',
  RN: 'Nordeste',
  PB: 'Nordeste',
  PE: 'Nordeste',
  AL: 'Nordeste',
  SE: 'Nordeste',
  BA: 'Nordeste',
  DF: 'Centro-Oeste',
  GO: 'Centro-Oeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  SP: 'Sudeste',
  RJ: 'Sudeste',
  MG: 'Sudeste',
  ES: 'Sudeste',
  PR: 'Sul',
  SC: 'Sul',
  RS: 'Sul',
};

function cents(value: { toString(): string }): number {
  return Math.round(Number(value.toString()) * 100);
}

function fmt(centsValue: number): string {
  return (centsValue / 100).toFixed(2);
}

function periodBounds(dataDe?: string, dataAte?: string): { from: Date; to: Date } {
  const to = dataAte ? new Date(dataAte) : new Date();
  const from = dataDe
    ? new Date(dataDe)
    : new Date(to.getTime() - EMPLOYEE_PAYMENT_WINDOW_DAYS * 86400000);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function tripScopeWhere(filters: ManagerReportFilters): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = { deletadoEm: null };
  if (filters.departamento) where.departamento = filters.departamento as DepartmentType;
  if (filters.status) where.status = filters.status as TripStatus;
  if (filters.centroDeCustoId) where.centroDeCustoId = filters.centroDeCustoId;
  if (filters.cidade) where.cidade = filters.cidade;
  if (filters.cliente) where.cliente = filters.cliente;
  if (filters.colaboradorId) {
    where.OR = [
      { criadoPorId: filters.colaboradorId },
      { participants: { some: { userId: filters.colaboradorId } } },
    ];
  }
  return where;
}

function tripWhere(
  filters: ManagerReportFilters,
  bounds: { from: Date; to: Date },
): Prisma.TripWhereInput {
  return {
    ...tripScopeWhere(filters),
    dataSaida: { gte: bounds.from, lte: bounds.to },
  };
}

export class PrismaDashboardRepository implements DashboardRepository {
  async managerReport(filters: ManagerReportFilters): Promise<DashboardManagerReport> {
    const bounds = periodBounds(filters.dataDe, filters.dataAte);
    const tripQuery = tripWhere(filters, bounds);
    const trips = await prisma.trip.findMany({
      where: tripQuery,
      select: {
        id: true,
        status: true,
        departamento: true,
        cidade: true,
        uf: true,
        criadoPor: { select: { id: true, name: true } },
      },
    });
    const tripIds = trips.map((trip) => trip.id);

    const expenses = await prisma.expense.findMany({
      where: {
        deletedAt: null,
        trip: { id: { in: tripIds } },
        ...(filters.categoriaCode ? { category: { code: filters.categoriaCode } } : {}),
      },
      select: {
        id: true,
        tripId: true,
        valor: true,
        reembolsavel: true,
        dataDespesa: true,
        category: { select: { code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        trip: {
          select: { cidade: true, centroDeCusto: { select: { nome: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const advances = tripIds.length
      ? await prisma.tripAdvance.findMany({ where: { tripId: { in: tripIds } } })
      : [];

    const payments = await prisma.tripPayment.findMany({ where: { tripId: { in: tripIds } } });
    const refunds = await prisma.tripRefund.findMany({ where: { tripId: { in: tripIds } } });

    const totalDespesasCents = expenses.reduce((sum, e) => sum + cents(e.valor), 0);
    const pagamentosCents = payments.reduce((sum, p) => sum + cents(p.valor), 0);
    const devolucoesCents = refunds.reduce((sum, r) => sum + cents(r.valor), 0);

    const totalSolicitadoCents = advances.reduce(
      (sum, advance) => sum + cents(advance.valorSolicitado),
      0,
    );
    const totalAprovadoCents = advances.reduce(
      (sum, advance) =>
        sum +
        (advance.valorAprovado &&
        (advance.status === 'APROVADO' ||
          advance.status === 'PAGAMENTO_PENDENTE' ||
          advance.status === 'PAGO')
          ? cents(advance.valorAprovado)
          : 0),
      0,
    );
    const totalPagoCents = advances.reduce(
      (sum, advance) =>
        sum +
        (advance.status === 'PAGO' && advance.valorAprovado ? cents(advance.valorAprovado) : 0),
      0,
    );
    const pendentesAnalise = advances.filter(
      (advance) => advance.status === 'SOLICITADO' || advance.status === 'EM_ANALISE',
    ).length;

    const reembolsavelPorTrip = new Map<string, number>();
    for (const expense of expenses) {
      if (expense.reembolsavel) {
        reembolsavelPorTrip.set(
          expense.tripId,
          (reembolsavelPorTrip.get(expense.tripId) ?? 0) + cents(expense.valor),
        );
      }
    }
    const pagoPorTrip = new Map<string, number>();
    for (const payment of payments) {
      pagoPorTrip.set(
        payment.tripId,
        (pagoPorTrip.get(payment.tripId) ?? 0) + cents(payment.valor),
      );
    }

    let valoresPendentesCents = 0;
    for (const trip of trips) {
      if (['APROVADA', 'FINANCEIRO'].includes(trip.status)) {
        const aprovado = reembolsavelPorTrip.get(trip.id) ?? 0;
        const pago = pagoPorTrip.get(trip.id) ?? 0;
        valoresPendentesCents += Math.max(0, aprovado - pago);
      }
    }

    const porColaboradorMap = new Map<string, { nome: string; total: number }>();
    const porCategoriaMap = new Map<string, { code: string; name: string; total: number }>();
    const porCidadeMap = new Map<string, number>();
    const porCentroMap = new Map<string, number>();
    const evolucaoMap = new Map<string, number>();
    for (const expense of expenses) {
      const author = expense.createdBy;
      const authorEntry = porColaboradorMap.get(author.id) ?? { nome: author.name, total: 0 };
      authorEntry.total += cents(expense.valor);
      porColaboradorMap.set(author.id, authorEntry);

      const key = expense.category.code;
      const catEntry = porCategoriaMap.get(key) ?? {
        code: expense.category.code,
        name: expense.category.name,
        total: 0,
      };
      catEntry.total += cents(expense.valor);
      porCategoriaMap.set(key, catEntry);

      const cidade = expense.trip.cidade;
      porCidadeMap.set(cidade, (porCidadeMap.get(cidade) ?? 0) + cents(expense.valor));

      const centro = expense.trip.centroDeCusto?.nome ?? 'Sem centro de custo';
      porCentroMap.set(centro, (porCentroMap.get(centro) ?? 0) + cents(expense.valor));

      const periodo = expense.dataDespesa.toISOString().slice(0, 7);
      evolucaoMap.set(periodo, (evolucaoMap.get(periodo) ?? 0) + cents(expense.valor));
    }

    const relatoriosPendentes = trips.filter((trip) =>
      ['EM_APROVACAO', 'EM_CORRECAO', 'FINANCEIRO'].includes(trip.status),
    ).length;

    const viagensPorDepartamentoMap = new Map<string, number>();
    const viagensPorRegiaoMap = new Map<string, number>();
    const cidadesVisitadasMap = new Map<
      string,
      { cidade: string; uf: string; quantidade: number }
    >();
    const viagensPorColaboradorMap = new Map<
      string,
      { id: string; nome: string; quantidade: number }
    >();
    for (const trip of trips) {
      viagensPorDepartamentoMap.set(
        trip.departamento,
        (viagensPorDepartamentoMap.get(trip.departamento) ?? 0) + 1,
      );
      const regiao = REGIAO_BY_UF[trip.uf.toUpperCase()] ?? 'Outras regiões';
      viagensPorRegiaoMap.set(regiao, (viagensPorRegiaoMap.get(regiao) ?? 0) + 1);

      const cidadeKey = `${trip.uf.toUpperCase()}|${trip.cidade}`;
      const cidadeEntry = cidadesVisitadasMap.get(cidadeKey) ?? {
        cidade: trip.cidade,
        uf: trip.uf.toUpperCase(),
        quantidade: 0,
      };
      cidadeEntry.quantidade += 1;
      cidadesVisitadasMap.set(cidadeKey, cidadeEntry);

      const author = trip.criadoPor;
      const colabEntry = viagensPorColaboradorMap.get(author.id) ?? {
        id: author.id,
        nome: author.name,
        quantidade: 0,
      };
      colabEntry.quantidade += 1;
      viagensPorColaboradorMap.set(author.id, colabEntry);
    }

    const statusCount = new Map<string, number>();
    const statusRows = await prisma.trip.groupBy({
      by: ['status'],
      where: tripScopeWhere(filters),
      _count: { _all: true },
    });
    for (const row of statusRows) statusCount.set(row.status, row._count._all);

    const totalReembolsado = Math.max(0, pagamentosCents - devolucoesCents);

    return {
      periodoDe: bounds.from.toISOString(),
      periodoAte: bounds.to.toISOString(),
      totalDespesas: fmt(totalDespesasCents),
      totalReembolsado: fmt(totalReembolsado),
      valoresPendentes: fmt(valoresPendentesCents),
      quantidadeViagens: trips.length,
      relatoriosPendentes,
      adiantamentos: {
        totalSolicitado: fmt(totalSolicitadoCents),
        totalAprovado: fmt(totalAprovadoCents),
        totalPago: fmt(totalPagoCents),
        pendentesAnalise,
      },
      porColaborador: [...porColaboradorMap.entries()].map(([id, entry]) => ({
        id,
        nome: entry.nome,
        total: fmt(entry.total),
      })),
      porCategoria: [...porCategoriaMap.values()].map((entry) => ({
        categoria: { code: entry.code, name: entry.name },
        total: fmt(entry.total),
      })),
      porCidade: [...porCidadeMap.entries()].map(([cidade, total]) => ({
        cidade,
        total: fmt(total),
      })),
      porCentroDeCusto: [...porCentroMap.entries()].map(([nome, total]) => ({
        nome,
        total: fmt(total),
      })),
      evolucaoTemporal: [...evolucaoMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([periodo, total]) => ({ periodo, total: fmt(total) })),
      reembolsosStatus: [...statusCount.entries()].map(([status, quantidade]) => ({
        status,
        quantidade,
      })),
      viagensPorDepartamento: [...viagensPorDepartamentoMap.entries()].map(
        ([departamento, quantidade]) => ({ departamento, quantidade }),
      ),
      viagensPorRegiao: [...viagensPorRegiaoMap.entries()]
        .map(([regiao, quantidade]) => ({ regiao, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      cidadesMaisVisitadas: [...cidadesVisitadasMap.values()].sort(
        (a, b) => b.quantidade - a.quantidade,
      ),
      viagensPorColaborador: [...viagensPorColaboradorMap.values()].sort(
        (a, b) => b.quantidade - a.quantidade,
      ),
    };
  }

  async employeeReport(userId: string): Promise<DashboardEmployeeReport> {
    const bounds = periodBounds();
    const trips = await prisma.trip.findMany({
      where: {
        deletadoEm: null,
        participants: { some: { userId } },
      },
      select: { id: true, status: true },
    });
    const tripIds = trips.map((trip) => trip.id);
    const replayable = new Set(tripIds);

    const countByStatus = (status: string) => trips.filter((trip) => trip.status === status).length;

    const payments = replayable.size
      ? await prisma.tripPayment.findMany({
          where: { tripId: { in: tripIds }, dataPagamento: { gte: bounds.from, lte: bounds.to } },
        })
      : [];
    const totalReembolsadoCents = payments.reduce((sum, p) => sum + cents(p.valor), 0);

    return {
      viagensEmAndamento: countByStatus('EM_ANDAMENTO'),
      relatoriosAguardandoAprovacao: countByStatus('EM_APROVACAO'),
      relatoriosEmCorrecao: countByStatus('EM_CORRECAO'),
      reembolsosPendentes: trips.filter((trip) => ['APROVADA', 'FINANCEIRO'].includes(trip.status))
        .length,
      relatoriosFinalizados: countByStatus('FINALIZADA'),
      totalReembolsado: fmt(totalReembolsadoCents),
    };
  }
}
