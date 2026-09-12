import type { OcrExtractionFields } from './ocr.types.js';

const CHAVE_NFE_PATTERN = /\d{44}/;

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
    const matches = [...line.matchAll(MONEY_PATTERN)].map((match) => match[1]!);
    const values = matches.length > 0 ? matches : [...line.matchAll(BARE_MONEY_PATTERN)].map((match) => match[1]!);
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
    const candidate = candidates.find((item) => label.test(item.line) && !/subtotal|base de cálculo|desconto|economiz/i.test(item.line));
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
    Number(sanitizeDecimal(candidate.raw)) > Number(sanitizeDecimal(best.raw))
      ? candidate
      : best,
  );
  const value = sanitizeDecimal(largest.raw);
  return value || undefined;
}

function parseLabeledMoney(text: string, labels: RegExp): string | undefined {
  for (const line of text.split('\n')) {
    if (!labels.test(line)) continue;
    const prefixed = [...line.matchAll(MONEY_PATTERN)].map((match) => match[1]!);
    const values = prefixed.length > 0 ? prefixed : [...line.matchAll(BARE_MONEY_PATTERN)].map((match) => match[1]!);
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
  const normalized = text.replace(/\r/g, '');

  const cnpj = extractCnpj(normalized);

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
  const hora = timeMatch ? timeMatch[0] : undefined;

  const valorTotal = parseMoney(normalized);
  const valorProdutos = parseLabeledMoney(normalized, /valor\s+total\s+dos\s+produtos|valor\s+dos\s+produtos/i);
  const desconto = parseLabeledMoney(normalized, /desconto|descontos/i);
  const tributos = parseLabeledMoney(normalized, /tributos\s+totais|total\s+tributos|impostos/i);
  const serie = captureLabel(normalized, /s[ée]rie\s*[:.]?\s*([\w-]+)/i);
  const inscricaoEstadual = captureLabel(normalized, /(?:inscri[cç][aã]o\s+estadual|\bI\.?\s*E\.?\b)\s*[:.]?\s*([\d./-]+)/i);
  const emitente = captureLabel(normalized, /emitente\s*[:.]?\s*(.+)$/i);
  const destinatario = captureLabel(normalized, /destinat[aá]rio\s*[:.]?\s*(.+)$/i);
  const formaPagamento = captureLabel(normalized, /(?:forma|meio)\s+(?:de\s+)?pagamento\s*[:.]?\s*(.+)$/i);
  const protocoloAutorizacao = captureLabel(normalized, /protocolo(?:\s+de\s+autoriza[cç][aã]o)?\s*[:.]?\s*([\d.-]+)/i);

  const hasStructuralContent = Boolean(
    cnpj || data || hora || valorTotal || valorProdutos || numeroDocumento || chaveAcesso,
  );
  const hasDocumentMarker = /(CNPJ|CPF|CUPOM|NOTA FISCAL|NFC-E|CHAVE)/i.test(normalized);

  let nomeEstabelecimento: string | undefined;
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
      if (/(identifica[cç][aã]o|assinatura|recebedor|destinat[aá]rio|remetente)/i.test(upper)) return false;
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
  }

  return {
    cnpj,
    nomeEstabelecimento,
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
    itens: [],
  };
}

function extractCnpj(text: string): string | undefined {
  const lines = text.split('\n');
  const candidates: Array<{ value: string; labeled: boolean; formatted: boolean }> = [];
  for (const line of lines) {
    for (const match of line.matchAll(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{2}\s*\d{3}\s*\d{3}\s*\/?\s*\d{4}\s*-?\s*\d{2}|\d{14})/g)) {
      const value = match[1]!.replace(/\D/g, '');
      if (value.length !== 14) continue;
      candidates.push({
        value,
        labeled: /\bCNPJ\b/i.test(line),
        formatted: /[./-\s]/.test(match[1]!),
      });
    }
  }
  return candidates.find((candidate) => candidate.labeled && candidate.formatted)?.value
    ?? candidates.find((candidate) => candidate.labeled)?.value
    ?? candidates.find((candidate) => candidate.formatted)?.value;
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
    if (!/(chave|acesso|chNFe|nfc|44)/i.test(line)) continue;
    const context = [line, lines[index + 1] ?? '', lines[index + 2] ?? ''].join(' ');
    const compact = context.replace(/\D/g, '');
    const match = compact.match(CHAVE_NFE_PATTERN);
    if (match) return match[0];
  }
  return undefined;
}

export function hasRecognizedContent(fields: OcrExtractionFields): boolean {
  return Boolean(
    fields.cnpj ||
    fields.valorTotal ||
    fields.chaveAcesso ||
    (fields.nomeEstabelecimento && fields.data),
  );
}
