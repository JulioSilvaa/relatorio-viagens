import type { OcrExtractedItem, OcrExtractionFields } from './ocr.types.js';

const CHAVE_NFE_PATTERN = /(?<!\d)\d{44}(?!\d)/;
const MAX_OCR_TEXT_LENGTH = 50000;

const MONEY_PATTERN = /R\$\s*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
const BARE_MONEY_PATTERN = /\b(\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}|\d+[.,]\d{2})\b/g;

const DATE_PATTERN =
  /\b(\d{2})\/(\d{2})\/(\d{4})\b|\b(\d{2})\/(\d{2})\/(\d{2})\b|\b(\d{4})-(\d{2})-(\d{2})\b/;

const TIME_PATTERN = /\b(\d{2}):(\d{2})(?::(\d{2}))?\b/;

const ESTABELECIMENTO_HINTS = [
  '(cnpj)',
  'cnpj',
  'doc',
  'documento',
  'tributos',
  'tribu',
  'numero do documento',
  'num. doc',
  'cupom',
  'nota fiscal',
  'nfe',
  'venda',
  'subtotal',
];

const ITEM_EXCLUDED_LINE =
  /^(subtotal|total|desconto|tributos?|impostos?|forma\s+(?:de\s+)?pagamento|troco|dinheiro|cart[aã]o|pix|chave|cnpj|cpf|cupom|nota\s+fiscal)\b/i;
const IDENTIFIER_LINE =
  /(?:c[oó]digo\s+de\s+barras|chave\s+(?:de\s+)?acesso|\bchNFe\b|\bcnpj\b|\bcpf\b|protocolo|inscri[cç][aã]o\s+estadual)/i;
// Linha de carimbo de data/hora reimpressa no rodapé do cupom (ex.: "04/11/2021
// 16:15:43V") — quando o OCR gruda a data com a hora sem espaço ("2021.16:15"),
// o fragmento "2021.16" bate no padrão de valor monetário e, sendo um número
// grande, vencia a heurística de "maior valor da nota" no lugar do total real.
const DATE_STAMP_LINE = /^\d{1,2}\/\d{1,2}\/\d{2,4}/;

function sanitizeDecimal(value: string): string {
  const compact = value.replace(/\s/g, '');
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact.replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number.toFixed(2) : '';
}

function parseMoney(text: string): string | undefined {
  const lines = text.split('\n').map((line) => line.trim());
  const candidates: Array<{ lineIndex: number; raw: string; line: string }> = [];
  lines.forEach((line, lineIndex) => {
    if (IDENTIFIER_LINE.test(line) || DATE_STAMP_LINE.test(line)) return;
    const matches = [...line.matchAll(MONEY_PATTERN)].map((match) => match[1]!);
    const values =
      matches.length > 0
        ? matches
        : [...line.matchAll(BARE_MONEY_PATTERN)].map((match) => match[1]!);
    for (const raw of values) candidates.push({ lineIndex, raw, line });
  });
  if (candidates.length === 0) return undefined;

  const priorityLabels = [
    /valor\s+da\s+nota/i,
    /valor\s+total\s+dos\s+produtos/i,
    /valor\s+total/i,
    /valor\s+a\s+pagar/i,
    /(^|\s)total\b/i,
  ];
  for (const label of priorityLabels) {
    const candidate = candidates.find(
      (item) =>
        label.test(item.line) && !/subtotal|base de cálculo|desconto|economiz/i.test(item.line),
    );
    if (candidate) {
      const value = sanitizeDecimal(candidate.raw);
      if (value) return value;
    }
  }

  const validCandidates = candidates.filter(
    (candidate) => !/(desconto|descont|economiz|economia|economizou)/i.test(candidate.line),
  );
  const pool = validCandidates.length > 0 ? validCandidates : candidates;
  const largest = pool.reduce((best, candidate) =>
    Number(sanitizeDecimal(candidate.raw)) > Number(sanitizeDecimal(best.raw)) ? candidate : best,
  );
  const value = sanitizeDecimal(largest.raw);
  return value || undefined;
}

function parseLabeledMoney(text: string, labels: RegExp): string | undefined {
  for (const line of text.split('\n')) {
    if (!labels.test(line)) continue;
    const prefixed = [...line.matchAll(MONEY_PATTERN)].map((match) => match[1]!);
    const values =
      prefixed.length > 0
        ? prefixed
        : [...line.matchAll(BARE_MONEY_PATTERN)].map((match) => match[1]!);
    const value = values.at(-1);
    if (value) {
      const sanitized = sanitizeDecimal(value);
      if (sanitized) return sanitized;
    }
  }
  return undefined;
}

function captureLabel(text: string, label: RegExp): string | undefined {
  for (const line of text.split('\n')) {
    const match = line.match(label);
    const value = match?.[1]?.trim().replace(/\s+/g, ' ');
    if (value && value.length >= 2) return value;
  }
  return undefined;
}

export function parseOcrText(text: string): OcrExtractionFields {
  const normalized = text.slice(0, MAX_OCR_TEXT_LENGTH).replace(/\r/g, '');

  const cnpj = extractCnpj(normalized);
  const tipoDocumento = detectDocumentType(normalized);

  const chaveAcesso = extractAccessKey(normalized);

  const numeroDocumento = extractDocumentNumber(normalized);

  const dateMatch = normalized.match(DATE_PATTERN);
  let data: Date | undefined;
  if (dateMatch) {
    const isEmpty = (value?: string) => value === undefined || value === '';

    let day: string;
    let month: string;
    let year: string;
    if (!isEmpty(dateMatch[1])) {
      day = dateMatch[1]!;
      month = dateMatch[2]!;
      year = dateMatch[3]!;
    } else if (!isEmpty(dateMatch[4])) {
      day = dateMatch[4]!;
      month = dateMatch[5]!;
      year = `20${dateMatch[6]!}`;
    } else {
      year = dateMatch[7]!;
      month = dateMatch[8]!;
      day = dateMatch[9]!;
    }
    const parsed = new Date(`${year}-${month}-${day}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      data = parsed;
    }
  }

  const timeMatch = normalized.match(TIME_PATTERN);
  const hora = timeMatch && isValidTime(timeMatch[0]) ? timeMatch[0] : undefined;

  const valorTotal = parseMoney(normalized);
  const valorProdutos = parseLabeledMoney(
    normalized,
    /valor\s+total\s+dos\s+produtos|valor\s+dos\s+produtos/i,
  );
  const desconto = parseLabeledMoney(normalized, /desconto|descontos/i);
  const tributos = parseLabeledMoney(normalized, /tributos\s+totais|total\s+tributos|impostos/i);
  const serie = captureLabel(normalized, /s[ée]rie\s*[:.]?\s*([\w-]+)/i);
  const inscricaoEstadual = captureLabel(
    normalized,
    /(?:inscri[cç][aã]o\s+estadual|\bI\.?\s*E\.?\b)\s*[:.]?\s*([\d./-]+)/i,
  );
  const emitente = captureLabel(normalized, /emitente\s*[:.]?\s*(.+)$/i);
  const destinatario = captureLabel(normalized, /destinat[aá]rio\s*[:.]?\s*(.+)$/i);
  const formaPagamento = captureLabel(
    normalized,
    /(?:forma|meio)\s+(?:de\s+)?pagamento\s*[:.]?\s*(.+)$/i,
  );
  const protocoloAutorizacao = captureLabel(
    normalized,
    /protocolo(?:\s+de\s+autoriza[cç][aã]o)?\s*[:.]?\s*([\d.-]+)/i,
  );
  const subtotal = parseLabeledMoney(normalized, /subtotal/i);
  const itens = parseItems(normalized);
  const alertaReconciliacao = hasReconciliationAlert(itens, valorTotal);
  const dataConfidence = data && !isPlausibleDate(data) ? 'baixa' : undefined;
  const confiancaExtracao =
    alertaReconciliacao || dataConfidence ? 'baixa' : itens.length > 0 ? 'alta' : 'media';

  const hasStructuralContent = Boolean(
    cnpj || data || hora || valorTotal || valorProdutos || numeroDocumento || chaveAcesso,
  );
  const hasDocumentMarker = /(CNPJ|CPF|CUPOM|NOTA FISCAL|NFC-E|CHAVE)/i.test(normalized);

  let nomeEstabelecimento: string | undefined;
  let endereco: string | undefined;
  if (hasStructuralContent || hasDocumentMarker) {
    const lines = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const sample = lines.slice(0, 12);
    const candidateLines = sample.filter((line) => {
      const upper = line.toUpperCase();
      if (
        /(^|\s)(R\$|CNPJ|CPF|CUPOM|NOTA FISCAL|TOTAL|SUBTOTAL|DATA|HORA|TRIBUTOS|CHAVE|PROTOCOLO|DANFE|DOCUMENTO|SÉRIE)/.test(
          upper,
        )
      ) {
        return false;
      }
      if (/^\d[\d.,\s-]*$/.test(line)) return false;
      if (!/[A-Za-zÀ-Úà-úÂÊÔÃÕáéíóúüç]/.test(line)) return false;
      if (/(@|www\.|http)/i.test(line)) return false;
      if (/^(fornecedor|cliente|vendedor|atendente|operador|caixa)\s*[:.]?/i.test(upper)) {
        return true;
      }
      if (line.length < 5 || line.split(' ').length > 12) return false;
      if (ESTABELECIMENTO_HINTS.some((hint) => upper.includes(hint))) return false;
      if (/(identifica[cç][aã]o|assinatura|recebedor|destinat[aá]rio|remetente)/i.test(upper))
        return false;
      return true;
    });
    const firstCandidate = candidateLines[0];
    const secondCandidate = candidateLines[1];
    const establishment =
      firstCandidate && firstCandidate.length <= 10 && secondCandidate
        ? `${firstCandidate} ${secondCandidate}`
        : firstCandidate;
    if (establishment && establishment.length >= 6) {
      nomeEstabelecimento = establishment;
    }
    endereco = lines.find((line) =>
      /\b(?:rua|r\.|avenida|av\.|rodovia|rod\.|estrada|est\.)\b/i.test(line),
    );
  }

  return {
    tipoDocumento: tipoDocumento.value,
    tipoDocumentoConfianca: tipoDocumento.confidence,
    cnpj,
    nomeEstabelecimento,
    endereco,
    data,
    hora,
    valorTotal,
    valorProdutos,
    desconto,
    tributos,
    numeroDocumento,
    serie,
    inscricaoEstadual,
    emitente,
    destinatario,
    formaPagamento,
    protocoloAutorizacao,
    chaveAcesso,
    subtotal,
    itens,
    confiancaExtracao,
    alertaReconciliacao,
  };
}

function detectDocumentType(text: string): {
  value:
    | 'NFC_E'
    | 'CFE_SAT'
    | 'NFE'
    | 'RECIBO'
    | 'COMPROVANTE_PAGAMENTO'
    | 'OUTRO'
    | 'NAO_IDENTIFICADO';
  confidence: 'alta' | 'media' | 'baixa';
} {
  if (/NFC\s*[- ]?E|NFC-E|NFCe/i.test(text)) return { value: 'NFC_E', confidence: 'alta' };
  if (/CF\s*[- ]?E\s*SAT|SAT\s*CF|CUPOM\s+FISCAL\s+ELETR[ÔO]NICO/i.test(text))
    return { value: 'CFE_SAT', confidence: 'media' };
  if (/NF\s*[- ]?E|DANFE|NOTA\s+FISCAL\s+ELETR[ÔO]NICA/i.test(text))
    return { value: 'NFE', confidence: 'alta' };
  if (/COMPROVANTE.*PAGAMENTO|PAGAMENTO.*CART[ÃA]O|TRANSA[CÇ][ÃA]O\s+APROVADA/i.test(text))
    return { value: 'COMPROVANTE_PAGAMENTO', confidence: 'media' };
  if (/\bRECIBO\b/i.test(text)) return { value: 'RECIBO', confidence: 'alta' };
  if (/CUPOM\s+FISCAL|NOTA\s+FISCAL/i.test(text)) return { value: 'OUTRO', confidence: 'baixa' };
  return { value: 'NAO_IDENTIFICADO', confidence: 'baixa' };
}

function isValidTime(value: string): boolean {
  const [hours = -1, minutes = -1, seconds] = value.split(':').map(Number);
  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    (seconds === undefined || (seconds >= 0 && seconds <= 59))
  );
}

function isPlausibleDate(value: Date): boolean {
  const currentYear = new Date().getFullYear();
  return value.getFullYear() >= 2000 && value.getFullYear() <= currentYear + 1;
}

function parseItems(text: string): OcrExtractedItem[] {
  const items: OcrExtractedItem[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (!line || ITEM_EXCLUDED_LINE.test(line)) continue;
    const moneyMatches = [...line.matchAll(BARE_MONEY_PATTERN)];
    if (moneyMatches.length === 0) continue;
    const lastMatch = moneyMatches.at(-1)!;
    const lastValue = Number(sanitizeDecimal(lastMatch[1]!));
    if (!Number.isFinite(lastValue)) continue;
    const secondLastMatch = moneyMatches.length > 1 ? moneyMatches.at(-2) : undefined;
    const secondLastValue = secondLastMatch
      ? Number(sanitizeDecimal(secondLastMatch[1]!))
      : undefined;
    const itemPrefixEnd = secondLastMatch?.index ?? lastMatch.index ?? line.length;
    const beforeValues = line.slice(0, itemPrefixEnd).trim();
    const parts = beforeValues.match(
      /^(?:(\d{3,14})\s+)?(\d+(?:[.,]\d+)?)\s+(?:(UN|UND|UNID|KG|G|L|ML|CX|PC|PCT|LT)\s+)?(.+)$/i,
    );
    if (!parts?.[2] || !parts[4]) continue;
    const quantity = Number(parts[2]!.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) continue;
    const total = lastValue;
    const unit = secondLastValue !== undefined ? secondLastValue : total / quantity;
    if (!Number.isFinite(unit) || !Number.isFinite(total)) continue;
    const description = parts[4].trim();
    if (description.length < 2 || !/[A-Za-zÀ-ÿ]/.test(description)) continue;
    items.push({
      codigo: parts[1] ?? null,
      descricao: description,
      quantidade: quantity,
      unidade: parts[3]?.toUpperCase() ?? null,
      valorUnitario: Number(unit.toFixed(2)),
      valorTotal: Number(total.toFixed(2)),
    });
  }
  return items;
}

function hasReconciliationAlert(items: OcrExtractedItem[], total: string | undefined): boolean {
  const declaredTotal = Number(total);
  if (items.length === 0 || !Number.isFinite(declaredTotal) || declaredTotal <= 0) return false;
  const itemTotal = items.reduce((sum, item) => sum + (item.valorTotal ?? 0), 0);
  return Math.abs(itemTotal - declaredTotal) / declaredTotal > 0.05;
}

function extractCnpj(text: string): string | undefined {
  const lines = text.split('\n');
  const candidates: Array<{ value: string; labeled: boolean; formatted: boolean }> = [];
  for (const line of lines) {
    for (const match of line.matchAll(
      /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{2}\s*\d{3}\s*\d{3}\s*\/?\s*\d{4}\s*-?\s*\d{2}|\d{14})/g,
    )) {
      const value = match[1]!.replace(/\D/g, '');
      if (value.length !== 14) continue;
      candidates.push({
        value,
        labeled: /\bCNPJ\b/i.test(line),
        formatted: /[./-\s]/.test(match[1]!),
      });
    }
  }
  return (
    candidates.find((candidate) => candidate.labeled && candidate.formatted)?.value ??
    candidates.find((candidate) => candidate.labeled)?.value ??
    candidates.find((candidate) => candidate.formatted)?.value
  );
}

function extractDocumentNumber(text: string): string | undefined {
  const lines = text.split('\n');
  const patterns = [
    /(?:NF[- ]?e|NFC[- ]?e|nota\s+fiscal)[^\d]{0,20}(?:n[º°o]?|n[uú]mero)?[^\d]{0,8}([\d][\d.\s-]{5,14}\d)/i,
    /(?:n[º°o]|n[uú]mero|documento)\s*[:.]?\s*([\d][\d.\s-]{5,14}\d)/i,
  ];
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match?.[1]) continue;
      const number = match[1].replace(/\D/g, '');
      if (number.length >= 6 && number.length < 44) return number;
    }
  }
  return undefined;
}

function extractAccessKey(text: string): string | undefined {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const context = [line, lines[index + 1] ?? '', lines[index + 2] ?? ''].join(' ');
    const match = context.match(CHAVE_NFE_PATTERN);
    if (match) return match[0];
  }
  return undefined;
}

export function normalizeAccessKey(value: string | undefined): string | undefined {
  return value && /^\d{44}$/.test(value) ? value : undefined;
}

export function hasSufficientOcrText(text: string): boolean {
  return (text.match(/[A-Za-zÀ-ÿ0-9]/g) ?? []).length >= 20;
}

export function hasRecognizedContent(fields: OcrExtractionFields): boolean {
  return Boolean(
    fields.cnpj ||
      fields.valorTotal ||
      fields.chaveAcesso ||
      (fields.nomeEstabelecimento && fields.data),
  );
}
