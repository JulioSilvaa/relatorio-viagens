import type { OcrExtractionFields } from './ocr.types.js';

const CNPJ_PATTERN =
  /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}|\d{2}\s*\d{3}\s*\d{3}\s*\d{4}\s*\d{2})/;

const CHAVE_NFE_PATTERN = /\b\d{44}\b/;

const NUMERO_NFE_PATTERN = /\b\d{6}\b/g;

const MONEY_PATTERN = /R\$\s*?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

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
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return Number(normalized).toFixed(2);
}

function parseMoney(text: string): string | undefined {
  const lines = text.split('\n').map((line) => line.trim());
  const candidates: Array<{ lineIndex: number; raw: string }> = [];
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(MONEY_PATTERN)) {
      candidates.push({ lineIndex, raw: match[1]! });
    }
  });
  if (candidates.length === 0) return undefined;

  const totalLines: string[] = [];
  lines.forEach((line, lineIndex) => {
    const normalized = line.replace(/\s+/g, ' ').toLowerCase();
    if (/(^|\s)(total|valor total|valor a pagar|v\. total|totals?)([\s:.-]*)$/.test(normalized)) {
      totalLines.push(normalized);
      totalLines.push(lines[lineIndex] ?? '');
      if (lines[lineIndex + 1]) totalLines.push(lines[lineIndex + 1] ?? '');
    }
  });

  for (const line of totalLines) {
    for (const match of line.matchAll(MONEY_PATTERN)) {
      return sanitizeDecimal(match[1]!);
    }
  }

  const last = candidates[candidates.length - 1]!;
  return sanitizeDecimal(last.raw);
}

export function parseOcrText(text: string): OcrExtractionFields {
  const normalized = text.replace(/\r/g, '');

  const cnpjMatch = normalized.match(CNPJ_PATTERN);
  const cnpj = cnpjMatch ? (cnpjMatch[1] ?? '').replace(/\D+/g, '').slice(0, 14) : undefined;

  const semSeparadores = normalized.replace(/(\d)\.(?=\d)/g, '$1');
  const chaveMatch = semSeparadores.match(CHAVE_NFE_PATTERN);
  const chaveAcesso = chaveMatch ? chaveMatch[0] : undefined;

  const numeroMatches = normalized.match(NUMERO_NFE_PATTERN);
  const numeroDocumento = numeroMatches ? numeroMatches.map((match) => match).join(',') : undefined;

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

  const hasStructuralContent = Boolean(
    cnpj || data || hora || valorTotal || numeroDocumento || chaveAcesso,
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
        /(^|\s)(R\$|CNPJ|CPF|CUPOM|NOTA FISCAL|TOTAL|SUBTOTAL|DATA|HORA|TRIBUTOS|CHAVE|PROTOCOLO)/.test(
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
      if (line.length < 8 || line.split(' ').length > 7) return false;
      if (ESTABELECIMENTO_HINTS.some((hint) => upper.includes(hint))) return false;
      return true;
    });
    const establishment = candidateLines[0] ?? lines[0];
    if (establishment && establishment.length >= 6 && establishment.split(' ').length <= 5) {
      nomeEstabelecimento = establishment;
    }
  }

  return {
    cnpj,
    nomeEstabelecimento,
    data,
    hora,
    valorTotal,
    numeroDocumento,
    chaveAcesso,
    itens: [],
  };
}

export function hasRecognizedContent(fields: OcrExtractionFields): boolean {
  return Boolean(
    fields.cnpj ||
      fields.nomeEstabelecimento ||
      fields.data ||
      fields.hora ||
      fields.valorTotal ||
      fields.numeroDocumento ||
      fields.chaveAcesso,
  );
}
