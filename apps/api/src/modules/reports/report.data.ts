import type {
  TripDetailRecord,
  TripParticipantRecord,
  ReceiptOcrDetail,
} from '../trips/repositories/trips.repository.js';
import type { TripFinanceData } from '../finance/finance.types.js';
import type {
  ReportData,
  ReportExpenseRow,
  ReportFinanceRecord,
  ReportOcrSummary,
  ReportOcrFieldSet,
  ReportOcrReceipt,
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

  const ocrDetalhes: ReportOcrReceipt[] = (trip.expenses ?? []).flatMap((expense) =>
    expense.receipts
      .filter((receipt) => receipt.ativo && receipt.ocr)
      .map((receipt) => ({
        fileName: receipt.fileName,
        categoria: expense.category.name,
        original: toReportOcrFields(receipt.ocr?.dadosOriginais ?? null),
        final: toReportOcrFields(receipt.ocr!)!,
      })),
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
      cartaoBandeira: p.cartaoBandeira,
    })),
    despesas,
    totalDespesas,
    totalReembolsavel,
    financeiro: { ...financeiro, totalAdiantamentos, totalReembolsos, totalDevolucoes },
    ocr: computeOcrSummary(trip),
    ocrDetalhes,
    versao,
    emitidoEm: new Date(),
    emitidoPor,
  };
}

function toReportOcrFields(
  value: Record<string, unknown> | ReceiptOcrDetail | null,
): ReportOcrFieldSet | null {
  if (!value) return null;
  const data = value.data;
  return {
    textoOriginal: typeof value.textoOriginal === 'string' ? value.textoOriginal : null,
    cnpj: typeof value.cnpj === 'string' ? value.cnpj : null,
    nomeEstabelecimento:
      typeof value.nomeEstabelecimento === 'string' ? value.nomeEstabelecimento : null,
    data:
      data instanceof Date
        ? data.toISOString()
        : typeof data === 'string'
          ? data
          : null,
    hora: typeof value.hora === 'string' ? value.hora : null,
    valorTotal: typeof value.valorTotal === 'string' ? value.valorTotal : null,
    valorProdutos: typeof value.valorProdutos === 'string' ? value.valorProdutos : null,
    desconto: typeof value.desconto === 'string' ? value.desconto : null,
    tributos: typeof value.tributos === 'string' ? value.tributos : null,
    numeroDocumento: typeof value.numeroDocumento === 'string' ? value.numeroDocumento : null,
    serie: typeof value.serie === 'string' ? value.serie : null,
    inscricaoEstadual: typeof value.inscricaoEstadual === 'string' ? value.inscricaoEstadual : null,
    emitente: typeof value.emitente === 'string' ? value.emitente : null,
    destinatario: typeof value.destinatario === 'string' ? value.destinatario : null,
    formaPagamento: typeof value.formaPagamento === 'string' ? value.formaPagamento : null,
    protocoloAutorizacao: typeof value.protocoloAutorizacao === 'string' ? value.protocoloAutorizacao : null,
    chaveAcesso: typeof value.chaveAcesso === 'string' ? value.chaveAcesso : null,
  };
}

function computeOcrSummary(trip: TripDetailRecord): ReportOcrSummary {
  let totalComprovantes = 0;
  let comOcr = 0;
  let manual = 0;
  let pendentes = 0;
  let falhas = 0;
  let valorExtraidoCents = 0;
  const chavesAcesso = new Set<string>();

  for (const expense of trip.expenses ?? []) {
    for (const receipt of expense.receipts.filter((r) => r.ativo)) {
      totalComprovantes += 1;
      if (receipt.ocr) {
        if (receipt.ocr.status === 'SUCESSO') comOcr += 1;
        else if (receipt.ocr.status === 'FALHA') falhas += 1;
        else pendentes += 1;
        if (receipt.ocr.origem === 'MANUAL') manual += 1;
        if (receipt.ocr.valorTotal) {
          valorExtraidoCents += Math.round(Number(receipt.ocr.valorTotal) * 100);
        }
        if (receipt.ocr.chaveAcesso) {
          chavesAcesso.add(receipt.ocr.chaveAcesso);
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
    chavesAcesso: [...chavesAcesso],
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
