import type {
  TripDetailRecord,
  TripParticipantRecord,
  ReceiptOcrDetail,
  ExpenseDetailRecord,
  ReceiptDetailRecord,
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
import { parseOcrText } from '../ocr/ocr-parser.js';

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

interface ReceiptWithExpense {
  expense: ExpenseDetailRecord;
  receipt: ReceiptDetailRecord;
}

function activeReceipts(trip: TripDetailRecord): ReceiptWithExpense[] {
  const result: ReceiptWithExpense[] = [];
  for (const expense of trip.expenses ?? []) {
    for (const receipt of expense.receipts) {
      if (!receipt.ativo) continue;
      result.push({ expense, receipt });
    }
  }
  return result;
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

  const ocrDetalhes: ReportOcrReceipt[] = [];
  for (const { expense, receipt } of activeReceipts(trip)) {
    const ocr = receipt.ocr;
    if (!ocr) continue;
    const final = toReportOcrFields(ocr) ?? emptyOcrFields();
    const original = toReportOcrFields(ocr.dadosOriginais ?? null);
    const rawText = original?.textoOriginal ?? final.textoOriginal;
    const parsedFromRaw = rawText
      ? toReportOcrFields(parseOcrText(rawText) as unknown as Record<string, unknown>)
      : null;
    const originalWithRawFallback = mergeOcrFields(original, parsedFromRaw ?? emptyOcrFields());
    ocrDetalhes.push({
      receiptId: receipt.id,
      fileHash: receipt.fileHash,
      fileName: receipt.fileName,
      categoria: expense.category.name,
      status: ocr.status,
      origem: ocr.origem,
      extraidoEm: ocr.extraidoEm,
      conferidoEm: ocr.conferidoEm,
      structured: mergeOcrFields(final, originalWithRawFallback),
      original: originalWithRawFallback,
      final,
    });
  }

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
  const nestedRecords = [
    'estabelecimento',
    'documentoFiscal',
    'documento_fiscal',
    'totais',
    'valores',
    'informacoesFiscais',
    'informacoes_fiscais',
    'outrasInformacoes',
    'outras_informacoes',
  ]
    .map((key) => record[key])
    .filter(
      (candidate): candidate is Record<string, unknown> =>
        Boolean(candidate) && typeof candidate === 'object',
    );
  const read = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) return record[key];
      const nested = nestedRecords.find(
        (candidate) => candidate[key] !== undefined && candidate[key] !== null,
      );
      if (nested) return nested[key];
    }
    return undefined;
  };
  const data = read('data', 'data_hora');
  const rawItems = Array.isArray(read('itens')) ? (read('itens') as unknown[]) : [];
  const itens = rawItems.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const descricaoValue = readFrom(candidate, 'descricao', 'description');
    const descricao = typeof descricaoValue === 'string' ? descricaoValue.trim() : '';
    const quantidade = toFiniteNumber(readFrom(candidate, 'quantidade', 'quantity'));
    const valorUnitario = toFiniteNumber(
      readFrom(candidate, 'valorUnitario', 'valor_unitario', 'unitPrice'),
    );
    const desconto = toFiniteNumber(readFrom(candidate, 'desconto', 'discount'));
    const valorTotal = toFiniteNumber(readFrom(candidate, 'valorTotal', 'valor_total', 'total'));
    if (!descricao) return [];
    return [
      {
        codigo:
          typeof readFrom(candidate, 'codigo', 'code') === 'string'
            ? (readFrom(candidate, 'codigo', 'code') as string)
            : null,
        descricao,
        quantidade,
        unidade:
          typeof readFrom(candidate, 'unidade', 'unit') === 'string'
            ? (readFrom(candidate, 'unidade', 'unit') as string)
            : null,
        valorUnitario,
        desconto,
        valorTotal,
        ncm: toText(readFrom(candidate, 'ncm')),
        cfop: toText(readFrom(candidate, 'cfop')),
        cstCsosn: toText(readFrom(candidate, 'cstCsosn', 'cst_csosn')),
        icms: toText(readFrom(candidate, 'icms')),
        pis: toText(readFrom(candidate, 'pis')),
        cofins: toText(readFrom(candidate, 'cofins')),
      },
    ];
  });
  const rawExtraFields = read('camposExtras', 'campos_extras');
  const camposExtras = Array.isArray(rawExtraFields)
    ? rawExtraFields.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const candidate = item as Record<string, unknown>;
        const label = toText(readFrom(candidate, 'label', 'campo', 'nome'));
        if (!label) return [];
        const confianca = readFrom(candidate, 'confianca', 'confidence');
        return [
          {
            secao: toText(readFrom(candidate, 'secao', 'section')),
            label,
            valor: toText(readFrom(candidate, 'valor', 'value')),
            confianca: toConfidence(confianca),
          },
        ];
      })
    : [];
  return {
    textoOriginal:
      typeof read('textoOriginal', 'texto_original') === 'string'
        ? (read('textoOriginal', 'texto_original') as string)
        : null,
    tipoDocumento: toText(read('tipoDocumento', 'tipo_documento')),
    tipoDocumentoConfianca: toConfidence(
      read('tipoDocumentoConfianca', 'tipo_documento_confianca'),
    ),
    endereco: toText(read('endereco')),
    cnpj: toText(read('cnpj')),
    nomeEstabelecimento: toText(read('nomeEstabelecimento', 'razao_social')),
    nomeFantasia: toText(read('nomeFantasia', 'nome_fantasia')),
    cidadeUf: toText(read('cidadeUf', 'cidade_uf')),
    data: toDateValue(data),
    hora: toText(read('hora')),
    valorTotal: toMoneyString(read('valorTotal', 'valor_total')),
    valorProdutos: toMoneyString(read('valorProdutos', 'valor_produtos')),
    desconto: toMoneyString(read('desconto', 'descontos')),
    tributos: toMoneyString(read('tributos')),
    acrescimos: toMoneyString(read('acrescimos', 'acrescimos_valor')),
    valorPago: toMoneyString(read('valorPago', 'valor_pago')),
    troco: toMoneyString(read('troco')),
    numeroDocumento: toText(read('numeroDocumento', 'numero_cupom', 'numero')),
    serie: toText(read('serie')),
    numeroSat: toText(read('numeroSat', 'numero_sat')),
    qrCode: toText(read('qrCode', 'qr_code')),
    inscricaoEstadual: toText(read('inscricaoEstadual', 'inscricao_estadual')),
    emitente: toText(read('emitente')),
    destinatario: toText(read('destinatario')),
    formaPagamento: toText(read('formaPagamento', 'forma_pagamento')),
    protocoloAutorizacao: toText(
      read('protocoloAutorizacao', 'protocolo_autorizacao', 'protocolo'),
    ),
    chaveAcesso: /^\d{44}$/.test(toText(read('chaveAcesso', 'chave_acesso')) ?? '')
      ? toText(read('chaveAcesso', 'chave_acesso'))
      : null,
    subtotal: toMoneyString(read('subtotal')),
    ncm: toText(read('ncm')),
    cfop: toText(read('cfop')),
    cstCsosn: toText(read('cstCsosn', 'cst_csosn')),
    icms: toText(read('icms')),
    pis: toText(read('pis')),
    cofins: toText(read('cofins')),
    observacoes: toText(read('observacoes', 'observations')),
    informacoesComplementares: toText(
      read('informacoesComplementares', 'informacoes_complementares'),
    ),
    camposExtras,
    itens,
    confiancaExtracao: toConfidence(read('confiancaExtracao', 'confianca_extracao')),
    alertaReconciliacao: read('alertaReconciliacao', 'alerta_reconciliacao') === true,
    erro: typeof read('erro') === 'string' ? (read('erro') as string) : null,
  };
}

function readFrom(record: Record<string, unknown>, ...keys: string[]): unknown {
  return keys
    .map((key) => record[key])
    .find((candidate) => candidate !== undefined && candidate !== null);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toConfidence(value: unknown): 'alta' | 'media' | 'baixa' | null {
  return value === 'alta' || value === 'media' || value === 'baixa' ? value : null;
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

function mergeOcrFields(
  primary: ReportOcrFieldSet | null,
  fallback: ReportOcrFieldSet,
): ReportOcrFieldSet {
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
    textoOriginal: null,
    tipoDocumento: null,
    tipoDocumentoConfianca: null,
    endereco: null,
    cnpj: null,
    nomeEstabelecimento: null,
    nomeFantasia: null,
    cidadeUf: null,
    data: null,
    hora: null,
    valorTotal: null,
    valorProdutos: null,
    desconto: null,
    tributos: null,
    acrescimos: null,
    valorPago: null,
    troco: null,
    numeroDocumento: null,
    serie: null,
    numeroSat: null,
    qrCode: null,
    inscricaoEstadual: null,
    emitente: null,
    destinatario: null,
    formaPagamento: null,
    protocoloAutorizacao: null,
    chaveAcesso: null,
    subtotal: null,
    ncm: null,
    cfop: null,
    cstCsosn: null,
    icms: null,
    pis: null,
    cofins: null,
    observacoes: null,
    informacoesComplementares: null,
    camposExtras: [],
    itens: [],
    confiancaExtracao: null,
    alertaReconciliacao: false,
    erro: null,
  };
}

function computeOcrSummary(trip: TripDetailRecord): ReportOcrSummary {
  const receipts = activeReceipts(trip);
  let comOcr = 0;
  let manual = 0;
  let pendentes = 0;
  let falhas = 0;
  let valorExtraidoCents = 0;
  const chavesAcesso = new Set<string>();

  for (const { receipt } of receipts) {
    if (receipt.ocr) {
      if (receipt.ocr.status === 'SUCESSO' && receipt.ocr.origem === 'MANUAL') manual += 1;
      else if (receipt.ocr.status === 'SUCESSO') comOcr += 1;
      else if (receipt.ocr.status === 'FALHA') falhas += 1;
      else pendentes += 1;
      if (
        receipt.ocr.origem === 'OCR' &&
        receipt.ocr.status === 'SUCESSO' &&
        receipt.ocr.valorTotal
      ) {
        valorExtraidoCents += Math.round(Number(receipt.ocr.valorTotal) * 100);
      }
      if (receipt.ocr.chaveAcesso && /^\d{44}$/.test(receipt.ocr.chaveAcesso)) {
        chavesAcesso.add(receipt.ocr.chaveAcesso);
      }
    } else {
      pendentes += 1;
    }
  }

  return {
    totalComprovantes: receipts.length,
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
