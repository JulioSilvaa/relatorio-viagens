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

  const ocrDetalhesByHash = new Map<string, ReportOcrReceipt>();
  for (const expense of trip.expenses ?? []) {
    for (const receipt of expense.receipts.filter((item) => item.ativo && item.ocr)) {
      if (ocrDetalhesByHash.has(receipt.fileHash)) continue;
      const final = toReportOcrFields(receipt.ocr!) ?? emptyOcrFields();
      const original = toReportOcrFields(receipt.ocr?.dadosOriginais ?? null);
      ocrDetalhesByHash.set(receipt.fileHash, {
        receiptId: receipt.id,
        fileHash: receipt.fileHash,
        fileName: receipt.fileName,
        categoria: expense.category.name,
        structured: mergeOcrFields(original, final),
        original,
        final,
      });
    }
  }
  const ocrDetalhes = [...ocrDetalhesByHash.values()];

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
  const record = value as Record<string, unknown>;
  const nestedRecords = ['estabelecimento', 'totais']
    .map((key) => record[key])
    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === 'object');
  const read = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) return record[key];
      const nested = nestedRecords.find((candidate) => candidate[key] !== undefined && candidate[key] !== null);
      if (nested) return nested[key];
    }
    return undefined;
  };
  const data = read('data', 'data_hora');
  const rawItems = Array.isArray(read('itens')) ? read('itens') as unknown[] : [];
  const itens = rawItems.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const descricaoValue = readFrom(candidate, 'descricao', 'description');
    const descricao = typeof descricaoValue === 'string' ? descricaoValue.trim() : '';
    const quantidade = toFiniteNumber(readFrom(candidate, 'quantidade', 'quantity'));
    const valorUnitario = toFiniteNumber(readFrom(candidate, 'valorUnitario', 'valor_unitario', 'unitPrice'));
    const valorTotal = toFiniteNumber(readFrom(candidate, 'valorTotal', 'valor_total', 'total'));
    if (!descricao) return [];
    return [{
      codigo: typeof readFrom(candidate, 'codigo', 'code') === 'string' ? readFrom(candidate, 'codigo', 'code') as string : null,
      descricao,
      quantidade,
      unidade: typeof readFrom(candidate, 'unidade', 'unit') === 'string' ? readFrom(candidate, 'unidade', 'unit') as string : null,
      valorUnitario,
      valorTotal,
    }];
  });
  return {
    textoOriginal: typeof read('textoOriginal', 'texto_original') === 'string' ? read('textoOriginal', 'texto_original') as string : null,
    endereco: typeof read('endereco') === 'string' ? read('endereco') as string : null,
    cnpj: typeof read('cnpj') === 'string' ? read('cnpj') as string : null,
    nomeEstabelecimento:
      typeof read('nomeEstabelecimento', 'razao_social') === 'string' ? read('nomeEstabelecimento', 'razao_social') as string : null,
    data: toDateValue(data),
    hora: typeof read('hora') === 'string' ? read('hora') as string : null,
    valorTotal: toMoneyString(read('valorTotal', 'valor_total')),
    valorProdutos: toMoneyString(read('valorProdutos', 'valor_produtos')),
    desconto: toMoneyString(read('desconto', 'descontos')),
    tributos: toMoneyString(read('tributos')),
    numeroDocumento: typeof read('numeroDocumento', 'numero_cupom') === 'string' ? read('numeroDocumento', 'numero_cupom') as string : null,
    serie: typeof read('serie') === 'string' ? read('serie') as string : null,
    inscricaoEstadual: typeof read('inscricaoEstadual') === 'string' ? read('inscricaoEstadual') as string : null,
    emitente: typeof read('emitente') === 'string' ? read('emitente') as string : null,
    destinatario: typeof read('destinatario') === 'string' ? read('destinatario') as string : null,
    formaPagamento: typeof read('formaPagamento', 'forma_pagamento') === 'string' ? read('formaPagamento', 'forma_pagamento') as string : null,
    protocoloAutorizacao: typeof read('protocoloAutorizacao') === 'string' ? read('protocoloAutorizacao') as string : null,
    chaveAcesso: typeof read('chaveAcesso', 'chave_acesso') === 'string' && /^\d{44}$/.test(read('chaveAcesso', 'chave_acesso') as string) ? read('chaveAcesso', 'chave_acesso') as string : null,
    subtotal: toMoneyString(read('subtotal')),
    itens,
    confiancaExtracao: read('confiancaExtracao', 'confianca_extracao') === 'alta' || read('confiancaExtracao', 'confianca_extracao') === 'media' || read('confiancaExtracao', 'confianca_extracao') === 'baixa' ? read('confiancaExtracao', 'confianca_extracao') as 'alta' | 'media' | 'baixa' : null,
    alertaReconciliacao: read('alertaReconciliacao', 'alerta_reconciliacao') === true,
    erro: typeof read('erro') === 'string' ? read('erro') as string : null,
  };
}

function readFrom(record: Record<string, unknown>, ...keys: string[]): unknown {
  return keys.map((key) => record[key]).find((candidate) => candidate !== undefined && candidate !== null);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.includes(',')
      ? value.replace(/\./g, '').replace(',', '.')
      : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toMoneyString(value: unknown): string | null {
  const number = toFiniteNumber(value);
  return number === null ? null : number.toFixed(2);
}

function toDateValue(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== 'string') return null;
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}(?:T|$)/)?.[0];
  if (isoDate) return value;
  const brazilianDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return brazilianDate ? `${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}` : null;
}

function mergeOcrFields(primary: ReportOcrFieldSet | null, fallback: ReportOcrFieldSet): ReportOcrFieldSet {
  if (!primary) return fallback;
  return {
    ...fallback,
    ...primary,
    itens: primary.itens.length > 0 ? primary.itens : fallback.itens,
    textoOriginal: primary.textoOriginal ?? fallback.textoOriginal,
    endereco: primary.endereco ?? fallback.endereco,
    cnpj: primary.cnpj ?? fallback.cnpj,
    nomeEstabelecimento: primary.nomeEstabelecimento ?? fallback.nomeEstabelecimento,
    data: primary.data ?? fallback.data,
    hora: primary.hora ?? fallback.hora,
    valorTotal: primary.valorTotal ?? fallback.valorTotal,
    valorProdutos: primary.valorProdutos ?? fallback.valorProdutos,
    desconto: primary.desconto ?? fallback.desconto,
    tributos: primary.tributos ?? fallback.tributos,
    numeroDocumento: primary.numeroDocumento ?? fallback.numeroDocumento,
    serie: primary.serie ?? fallback.serie,
    inscricaoEstadual: primary.inscricaoEstadual ?? fallback.inscricaoEstadual,
    emitente: primary.emitente ?? fallback.emitente,
    destinatario: primary.destinatario ?? fallback.destinatario,
    formaPagamento: primary.formaPagamento ?? fallback.formaPagamento,
    protocoloAutorizacao: primary.protocoloAutorizacao ?? fallback.protocoloAutorizacao,
    chaveAcesso: primary.chaveAcesso ?? fallback.chaveAcesso,
    subtotal: primary.subtotal ?? fallback.subtotal,
    erro: primary.erro ?? fallback.erro,
    confiancaExtracao: primary.confiancaExtracao ?? fallback.confiancaExtracao,
    alertaReconciliacao: primary.alertaReconciliacao || fallback.alertaReconciliacao,
  };
}

function emptyOcrFields(): ReportOcrFieldSet {
  return {
    textoOriginal: null, endereco: null, cnpj: null, nomeEstabelecimento: null, data: null, hora: null,
    valorTotal: null, valorProdutos: null, desconto: null, tributos: null, numeroDocumento: null,
    serie: null, inscricaoEstadual: null, emitente: null, destinatario: null, formaPagamento: null,
    protocoloAutorizacao: null, chaveAcesso: null, subtotal: null, itens: [], confiancaExtracao: null,
    alertaReconciliacao: false, erro: null,
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

  const seenHashes = new Set<string>();
  for (const expense of trip.expenses ?? []) {
    for (const receipt of expense.receipts.filter((r) => r.ativo)) {
      if (seenHashes.has(receipt.fileHash)) continue;
      seenHashes.add(receipt.fileHash);
      totalComprovantes += 1;
      if (receipt.ocr) {
        if (receipt.ocr.status === 'SUCESSO' && receipt.ocr.origem === 'MANUAL') manual += 1;
        else if (receipt.ocr.status === 'SUCESSO') comOcr += 1;
        else if (receipt.ocr.status === 'FALHA') falhas += 1;
        else pendentes += 1;
        if (receipt.ocr.origem === 'OCR' && receipt.ocr.status === 'SUCESSO' && receipt.ocr.valorTotal) {
          valorExtraidoCents += Math.round(Number(receipt.ocr.valorTotal) * 100);
        }
        if (receipt.ocr.chaveAcesso && /^\d{44}$/.test(receipt.ocr.chaveAcesso)) {
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
