import type {
  TripDetailRecord,
  TripParticipantRecord,
} from '../trips/repositories/trips.repository.js';
import type { TripFinanceData } from '../finance/finance.types.js';
import type {
  ReportData,
  ReportExpenseRow,
  ReportFinanceRecord,
  ReportOcrSummary,
  ReportTripData,
} from './report.types.js';

function toCents(value: { valor: string }): number {
  return Math.round(Number(value.valor) * 100);
}

function fmt(centsValue: number): string {
  return (centsValue / 100).toFixed(2);
}

function toTripData(trip: TripDetailRecord): ReportTripData {
  return {
    id: trip.id,
    cliente: trip.cliente,
    cidade: trip.cidade,
    uf: trip.uf,
    dataSaida: trip.dataSaida,
    dataRetorno: trip.dataRetorno,
    departamento: trip.departamento,
    motivo: trip.motivo,
    veiculo: trip.veiculo,
    placa: trip.placa,
    tipoVeiculo: trip.tipoVeiculo,
    kmInicial: trip.kmInicial,
    kmFinal: trip.kmFinal,
    taxaKm: trip.taxaKm,
    centroDeCusto: trip.centroDeCustoId,
    observacoes: trip.observacoes,
    status: trip.status,
  };
}

function toFinanceRecords(finance: TripFinanceData | undefined): {
  adiantamentos: ReportFinanceRecord[];
  reembolsos: ReportFinanceRecord[];
  devolucoes: ReportFinanceRecord[];
} {
  return {
    adiantamentos: (finance?.advances ?? [])
      .filter((a) => a.status === 'PAGO')
      .map((a) => ({
        id: a.id,
        valor: a.valorAprovado ?? a.valorSolicitado,
        data: a.pagoEm ?? a.solicitadoEm,
        responsavel: a.solicitadoPor.name,
        observacoes: a.observacoesPagamento ?? a.justificativaAnalise ?? null,
        comprovanteNome: null,
      })),
    reembolsos: (finance?.payments ?? []).map((p) => ({
      id: p.id,
      valor: p.valor,
      data: p.dataPagamento,
      responsavel: p.responsavel.name,
      observacoes: p.observacoes,
      comprovanteNome: p.comprovanteNome,
    })),
    devolucoes: (finance?.refunds ?? []).map((r) => ({
      id: r.id,
      valor: r.valor,
      data: r.data,
      responsavel: r.registradoPor.name,
      observacoes: r.observacoes,
      comprovanteNome: r.comprovanteNome,
    })),
  };
}

export function buildReportData(
  trip: TripDetailRecord,
  finance: TripFinanceData | undefined,
  emitidoPor: string,
  versao = 1,
): ReportData {
  const despesas: ReportExpenseRow[] = (trip.expenses ?? [])
    .filter((expense) => expense.deletedAt === null)
    .map((expense) => ({
      id: expense.id,
      categoria: expense.category.name,
      dataDespesa: expense.dataDespesa,
      valor: expense.valor,
      reembolsavel: expense.reembolsavel,
      justificativa: expense.justificativa,
      alertaExcesso: expense.alertaExcesso,
      autor: expense.criadoPor.name,
      comprovantes: expense.receipts.filter((receipt) => receipt.ativo).length,
    }));

  const totalDespesas = fmt(despesas.reduce((sum, e) => sum + toCents(e), 0));
  const totalReembolsavel = fmt(
    despesas.filter((e) => e.reembolsavel).reduce((sum, e) => sum + toCents(e), 0),
  );

  const financeiro = toFinanceRecords(finance);
  const totalAdiantamentos = fmt(financeiro.adiantamentos.reduce((sum, r) => sum + toCents(r), 0));
  const totalReembolsos = fmt(financeiro.reembolsos.reduce((sum, r) => sum + toCents(r), 0));
  const totalDevolucoes = fmt(financeiro.devolucoes.reduce((sum, r) => sum + toCents(r), 0));

  return {
    trip: toTripData(trip),
    participantes: trip.participants.map((p) => ({
      id: p.userId,
      nome: p.name,
      cartaoLast4: p.cartaoLast4,
    })),
    despesas,
    totalDespesas,
    totalReembolsavel,
    financeiro: { ...financeiro, totalAdiantamentos, totalReembolsos, totalDevolucoes },
    ocr: computeOcrSummary(trip),
    versao,
    emitidoEm: new Date(),
    emitidoPor,
  };
}

function computeOcrSummary(trip: TripDetailRecord): ReportOcrSummary {
  let totalComprovantes = 0;
  let comOcr = 0;
  let manual = 0;
  let pendentes = 0;
  let falhas = 0;
  let valorExtraidoCents = 0;

  for (const expense of trip.expenses ?? []) {
    for (const receipt of expense.receipts.filter((r) => r.ativo)) {
      totalComprovantes += 1;
      if (receipt.ocr) {
        if (receipt.ocr.status === 'SUCESSO') comOcr += 1;
        else if (receipt.ocr.status === 'FALHA') falhas += 1;
        else pendentes += 1;
        if (receipt.ocr.origem === 'MANUAL') manual += 1;
        if (receipt.ocr.valorExtraido) {
          valorExtraidoCents += Math.round(Number(receipt.ocr.valorExtraido) * 100);
        }
      } else {
        pendentes += 1;
      }
    }
  }

  return {
    totalComprovantes,
    comOcr,
    manual,
    pendentes,
    falhas,
    valorExtraidoTotal: fmt(valorExtraidoCents),
  };
}

export function cents(value: { valor: string }): number {
  return toCents(value);
}

export function formatCents(centsValue: number): string {
  return fmt(centsValue);
}

export function participantsNames(participants: TripParticipantRecord[]): string {
  return participants.map((p) => p.name).join(', ');
}
