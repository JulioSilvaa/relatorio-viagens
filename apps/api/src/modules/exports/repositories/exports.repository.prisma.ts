import ExcelJS from 'exceljs';
import type { Prisma } from '@prisma/client';
import type { TripStatus } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import type { ExcelExpenseFilters, ExportsRepository, GeneratedExcel } from '../excel.types.js';

const MAX_ROWS = 50000;

function brl(value: { toString(): string }): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
}

function dateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export class PrismaExportsRepository implements ExportsRepository {
  async buildExpensesExcel(
    filters: ExcelExpenseFilters,
    scope: { global: boolean; userId: string },
  ): Promise<GeneratedExcel> {
    const tripWhere: Prisma.TripWhereInput = { deletadoEm: null };
    const tripScopes: Prisma.TripWhereInput[] = [];
    if (!scope.global) {
      tripScopes.push({
        OR: [{ criadoPorId: scope.userId }, { participants: { some: { userId: scope.userId } } }],
      });
    }
    if (filters.dataDe || filters.dataAte) {
      tripScopes.push({
        dataSaida: {
          ...(filters.dataDe ? { gte: new Date(filters.dataDe) } : {}),
          ...(filters.dataAte ? { lte: new Date(filters.dataAte) } : {}),
        },
      });
    }
    if (filters.cliente)
      tripScopes.push({ cliente: { contains: filters.cliente, mode: 'insensitive' } });
    if (filters.cidade)
      tripScopes.push({ cidade: { contains: filters.cidade, mode: 'insensitive' } });
    if (filters.status) tripScopes.push({ status: filters.status as TripStatus });
    if (filters.departamento)
      tripScopes.push({
        departamento: filters.departamento as Prisma.TripWhereInput['departamento'],
      });
    if (filters.centroDeCustoId) tripScopes.push({ centroDeCustoId: filters.centroDeCustoId });
    if (filters.colaboradorId) {
      tripScopes.push({
        OR: [
          { criadoPorId: filters.colaboradorId },
          { participants: { some: { userId: filters.colaboradorId } } },
        ],
      });
    }
    if (tripScopes.length > 0) tripWhere.AND = tripScopes;

    const expenses = await prisma.expense.findMany({
      where: {
        deletedAt: null,
        trip: tripWhere,
      },
      select: {
        id: true,
        valor: true,
        dataDespesa: true,
        reembolsavel: true,
        justificativa: true,
        alertaExcesso: true,
        category: { select: { code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        trip: {
          select: {
            id: true,
            cliente: true,
            cidade: true,
            uf: true,
            dataSaida: true,
            dataRetorno: true,
            status: true,
            departamento: true,
            centroDeCusto: { select: { nome: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_ROWS,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Viagens e Despesas';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Despesas');
    sheet.columns = [
      { header: 'Relatório', key: 'tripId', width: 34 },
      { header: 'Cliente', key: 'cliente', width: 22 },
      { header: 'Cidade/UF', key: 'cidade', width: 20 },
      { header: 'Período', key: 'periodo', width: 24 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Departamento', key: 'departamento', width: 12 },
      { header: 'Centro de custo', key: 'centro', width: 18 },
      { header: 'Colaborador', key: 'colaborador', width: 22 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Justificativa', key: 'justificativa', width: 45 },
      { header: 'Reembolsável', key: 'reembolsavel', width: 12 },
      { header: 'Alerta', key: 'alerta', width: 12 },
      { header: 'Valor', key: 'valor', width: 14 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };

    let totalCents = 0;
    let reembolsavelCents = 0;
    const porCategoria = new Map<string, number>();
    for (const expense of expenses) {
      const centsValue = Math.round(Number(expense.valor) * 100);
      totalCents += centsValue;
      if (expense.reembolsavel) reembolsavelCents += centsValue;
      porCategoria.set(
        expense.category.name,
        (porCategoria.get(expense.category.name) ?? 0) + centsValue,
      );
      sheet.addRow({
        tripId: expense.trip.id,
        cliente: expense.trip.cliente,
        cidade: `${expense.trip.cidade}/${expense.trip.uf}`,
        periodo: `${dateBR(expense.trip.dataSaida)} a ${dateBR(expense.trip.dataRetorno)}`,
        status: expense.trip.status,
        departamento: expense.trip.departamento,
        centro: expense.trip.centroDeCusto?.nome ?? null,
        colaborador: expense.createdBy.name,
        categoria: expense.category.name,
        data: dateBR(expense.dataDespesa),
        justificativa: expense.justificativa,
        reembolsavel: expense.reembolsavel ? 'sim' : 'não',
        alerta: expense.alertaExcesso ?? '',
        valor: brl(expense.valor),
      });
    }

    const summary = workbook.addWorksheet('Resumo');
    summary.columns = [
      { header: 'Indicador', key: 'indicador', width: 32 },
      { header: 'Valor', key: 'valor', width: 18 },
    ];
    summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    summary.addRow({ indicador: 'Total de despesas', valor: brl((totalCents / 100).toFixed(2)) });
    summary.addRow({
      indicador: 'Total reembolsável',
      valor: brl((reembolsavelCents / 100).toFixed(2)),
    });
    summary.addRow({ indicador: 'Quantidade de despesas', valor: expenses.length });
    summary.addRow({ indicador: 'Categorias', valor: '' });
    for (const [name, centsValue] of [...porCategoria.entries()].sort((a, b) => b[1] - a[1])) {
      summary.addRow({ indicador: `  ${name}`, valor: brl((centsValue / 100).toFixed(2)) });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      fileName: 'relatorio-despesas.xlsx',
      content: Buffer.from(buffer),
    };
  }
}
