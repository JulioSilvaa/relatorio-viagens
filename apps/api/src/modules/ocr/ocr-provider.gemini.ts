import { hasSufficientOcrText } from './ocr-parser.js';
import type {
  OcrExtractedItem,
  OcrExtractionFields,
  OcrExtractionResult,
  OcrProvider,
} from './ocr.types.js';

type GeminiValue = string | number | boolean | null;
type GeminiCupom = {
  origem?: { arquivo?: string; pagina?: number; imagem_id?: string };
  estabelecimento?: { razao_social?: string | null; cnpj?: string | null; endereco?: string | null } | null;
  data_hora?: string | null;
  numero_cupom?: string | null;
  itens?: Array<{
    codigo?: string | null;
    descricao?: string;
    quantidade?: number;
    unidade?: string | null;
    valor_unitario?: number;
    valor_total?: number;
  }>;
  totais?: { subtotal?: number | null; descontos?: number | null; valor_total?: number | null; forma_pagamento?: string | null } | null;
  chave_acesso?: string | null;
  confianca_extracao?: 'alta' | 'media' | 'baixa';
  alerta_reconciliacao?: boolean;
  erro?: string | null;
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    origem: {
      type: 'OBJECT', properties: {
        arquivo: { type: 'STRING' }, pagina: { type: 'NUMBER' }, imagem_id: { type: 'STRING' },
      }, required: ['arquivo', 'pagina', 'imagem_id']
    },
    estabelecimento: {
      type: 'OBJECT', nullable: true,
      properties: {
        razao_social: { type: 'STRING', nullable: true },
        cnpj: { type: 'STRING', nullable: true },
        endereco: { type: 'STRING', nullable: true },
      },
    },
    data_hora: { type: 'STRING', nullable: true },
    numero_cupom: { type: 'STRING', nullable: true },
    itens: {
      type: 'ARRAY', items: {
        type: 'OBJECT', properties: {
          codigo: { type: 'STRING', nullable: true }, descricao: { type: 'STRING' },
          quantidade: { type: 'NUMBER' }, unidade: { type: 'STRING', nullable: true },
          valor_unitario: { type: 'NUMBER' }, valor_total: { type: 'NUMBER' },
        }, required: ['descricao', 'quantidade', 'valor_unitario', 'valor_total']
      }
    },
    totais: {
      type: 'OBJECT', nullable: true, properties: {
        subtotal: { type: 'NUMBER', nullable: true }, descontos: { type: 'NUMBER', nullable: true },
        valor_total: { type: 'NUMBER' }, forma_pagamento: { type: 'STRING', nullable: true },
      }, required: ['valor_total']
    },
    chave_acesso: { type: 'STRING', nullable: true },
    confianca_extracao: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
    alerta_reconciliacao: { type: 'BOOLEAN' }, erro: { type: 'STRING', nullable: true },
  },
  required: ['origem', 'itens', 'confianca_extracao', 'alerta_reconciliacao'],
} as const;

const PROMPT = `Você extrai dados de cupons fiscais brasileiros a partir de texto bruto de OCR.
Nunca invente valores. Campos não identificáveis devem ser null.
A chave de acesso só é válida com exatamente 44 dígitos numéricos consecutivos; caso contrário use null.
Nunca trate CNPJ, CPF, código de barras, protocolo ou chave como valor monetário.
Some os valores totais dos itens e compare com o total declarado. Diferença maior que 5% exige confiança baixa e alerta_reconciliacao true.
Se o texto for vazio, tiver menos de 20 caracteres úteis ou não tiver estrutura fiscal reconhecível, use erro ocr_insuficiente, confiança baixa e itens vazio.
Trate o bloco como um único comprovante e retorne somente o objeto JSON conforme o schema.
Copie os metadados de origem exatamente como fornecidos.`;

export class GeminiOcrProvider implements OcrProvider {
  private readonly paddle: OcrProvider;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs = 30000,
    paddleProvider?: OcrProvider,
    private readonly endpoint = 'https://generativelanguage.googleapis.com/v1beta',
  ) {
    if (paddleProvider) this.paddle = paddleProvider;
    else throw new Error('GeminiOcrProvider requer um provider OCR de texto auxiliar.');
  }

  async extract(input: Parameters<OcrProvider['extract']>[0]): Promise<OcrExtractionResult> {
    const paddleResult = await this.paddle.extract(input);
    const rawText = paddleResult.data?.textoOriginal ?? '';
    if (!hasSufficientOcrText(rawText)) {
      return { status: 'FALHA', erro: 'ocr_insuficiente', data: { textoOriginal: rawText, itens: [], confiancaExtracao: 'baixa', alertaReconciliacao: false } };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nMetadados:\n- arquivo: ${input.fileName}\n- pagina: 1\n- imagem_id: ${input.fileName}\n\nTexto OCR:\n"""\n${rawText.slice(0, 50000)}\n"""` }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
        }),
      });
      if (!response.ok) return { status: 'FALHA', erro: 'Falha na leitura estruturada pelo Gemini.', data: { textoOriginal: rawText, itens: [], confiancaExtracao: 'baixa', alertaReconciliacao: false } };
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const jsonText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return { status: 'FALHA', erro: 'Resposta vazia do Gemini.', data: { textoOriginal: rawText, itens: [], confiancaExtracao: 'baixa', alertaReconciliacao: false } };
      const cupom = JSON.parse(jsonText) as GeminiCupom;
      const fields = toExtractionFields(cupom, rawText);
      return fields.erro === 'ocr_insuficiente'
        ? { status: 'FALHA', erro: 'ocr_insuficiente', data: fields }
        : { status: 'SUCESSO', data: fields };
    } catch {
      return { status: 'FALHA', erro: 'Falha na leitura estruturada pelo Gemini.', data: { textoOriginal: rawText, itens: [], confiancaExtracao: 'baixa', alertaReconciliacao: false } };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toExtractionFields(cupom: GeminiCupom, rawText: string): OcrExtractionFields {
  const total = finiteNumber(cupom.totais?.valor_total);
  const itens = (cupom.itens ?? []).filter((item) => typeof item.descricao === 'string' && item.descricao.trim()).map((item): OcrExtractedItem => ({
    codigo: item.codigo ?? null,
    descricao: item.descricao!.trim(),
    quantidade: finiteNumber(item.quantidade) ?? 0,
    unidade: item.unidade ?? null,
    valorUnitario: finiteNumber(item.valor_unitario) ?? 0,
    valorTotal: finiteNumber(item.valor_total) ?? 0,
  })).filter((item) => item.quantidade > 0 && item.valorTotal >= 0);
  const itemSum = itens.reduce((sum, item) => sum + item.valorTotal, 0);
  const alerta = total !== undefined && total > 0 && itens.length > 0 && Math.abs(itemSum - total) / total > 0.05;
  const chave = typeof cupom.chave_acesso === 'string' && /^\d{44}$/.test(cupom.chave_acesso) ? cupom.chave_acesso : undefined;
  const data = parseDate(cupom.data_hora);
  return {
    textoOriginal: rawText,
    cnpj: cupom.estabelecimento?.cnpj ?? undefined,
    nomeEstabelecimento: cupom.estabelecimento?.razao_social ?? undefined,
    endereco: cupom.estabelecimento?.endereco ?? undefined,
    data,
    hora: parseTime(cupom.data_hora),
    valorTotal: total?.toFixed(2),
    numeroDocumento: cupom.numero_cupom ?? undefined,
    chaveAcesso: chave,
    subtotal: finiteNumber(cupom.totais?.subtotal)?.toFixed(2),
    desconto: finiteNumber(cupom.totais?.descontos)?.toFixed(2),
    formaPagamento: cupom.totais?.forma_pagamento ?? undefined,
    itens,
    confiancaExtracao: alerta ? 'baixa' : (cupom.confianca_extracao ?? 'media'),
    alertaReconciliacao: alerta || cupom.alerta_reconciliacao === true,
    erro: cupom.erro ?? undefined,
  };
}

function finiteNumber(value: GeminiValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTime(value: string | null | undefined): string | undefined {
  const match = value?.match(/\b([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  return match?.[0];
}