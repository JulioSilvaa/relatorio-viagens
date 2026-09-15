import { logger } from '../../shared/logger.js';
import type {
  OcrExtractedItem,
  OcrDocumentType,
  OcrExtractionFields,
  OcrExtractionResult,
  OcrProvider,
} from './ocr.types.js';

const GEMINI_MAX_ATTEMPTS = 2;

type GeminiValue = string | number | boolean | null;
type GeminiCupom = {
  origem?: { arquivo?: string; pagina?: number; imagem_id?: string };
  tipo_documento?: string | null;
  tipo_documento_confianca?: 'alta' | 'media' | 'baixa' | null;
  estabelecimento?: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    inscricao_estadual?: string | null;
    endereco?: string | null;
    cidade_uf?: string | null;
  } | null;
  documento_fiscal?: {
    tipo?: string | null;
    numero?: string | null;
    serie?: string | null;
    data?: string | null;
    hora?: string | null;
    chave_acesso?: string | null;
    protocolo?: string | null;
    numero_sat?: string | null;
    qr_code?: string | null;
  } | null;
  itens?: Array<{
    codigo?: string | null;
    descricao?: string;
    quantidade?: number;
    unidade?: string | null;
    valor_unitario?: number;
    desconto?: number | null;
    valor_total?: number;
    ncm?: string | null;
    cfop?: string | null;
    cst_csosn?: string | null;
    icms?: string | null;
    pis?: string | null;
    cofins?: string | null;
  }>;
  valores?: {
    subtotal?: number | null;
    descontos?: number | null;
    acrescimos?: number | null;
    total?: number | null;
    forma_pagamento?: string | null;
    valor_pago?: number | null;
    troco?: number | null;
  } | null;
  informacoes_fiscais?: {
    ncm?: string | null;
    cfop?: string | null;
    cst_csosn?: string | null;
    icms?: string | null;
    pis?: string | null;
    cofins?: string | null;
  } | null;
  outras_informacoes?: {
    observacoes?: string | null;
    informacoes_complementares?: string | null;
  } | null;
  campos_extras?: Array<{
    secao?: string | null;
    label?: string;
    valor?: string | number | null;
    confianca?: 'alta' | 'media' | 'baixa' | null;
  }>;
  confianca_extracao?: 'alta' | 'media' | 'baixa';
  alerta_reconciliacao?: boolean;
  erro?: string | null;
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    origem: {
      type: 'OBJECT',
      properties: {
        arquivo: { type: 'STRING' },
        pagina: { type: 'NUMBER' },
        imagem_id: { type: 'STRING' },
      },
      required: ['arquivo', 'pagina', 'imagem_id'],
    },
    tipo_documento: {
      type: 'STRING',
      enum: [
        'NFC_E',
        'CFE_SAT',
        'NFE',
        'RECIBO',
        'COMPROVANTE_PAGAMENTO',
        'OUTRO',
        'NAO_IDENTIFICADO',
      ],
    },
    tipo_documento_confianca: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
    estabelecimento: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        razao_social: { type: 'STRING', nullable: true },
        nome_fantasia: { type: 'STRING', nullable: true },
        cnpj: { type: 'STRING', nullable: true },
        inscricao_estadual: { type: 'STRING', nullable: true },
        endereco: { type: 'STRING', nullable: true },
        cidade_uf: { type: 'STRING', nullable: true },
      },
    },
    documento_fiscal: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        tipo: { type: 'STRING', nullable: true },
        numero: { type: 'STRING', nullable: true },
        serie: { type: 'STRING', nullable: true },
        data: { type: 'STRING', nullable: true },
        hora: { type: 'STRING', nullable: true },
        chave_acesso: { type: 'STRING', nullable: true },
        protocolo: { type: 'STRING', nullable: true },
        numero_sat: { type: 'STRING', nullable: true },
        qr_code: { type: 'STRING', nullable: true },
      },
    },
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          codigo: { type: 'STRING', nullable: true },
          descricao: { type: 'STRING' },
          quantidade: { type: 'NUMBER', nullable: true },
          unidade: { type: 'STRING', nullable: true },
          valor_unitario: { type: 'NUMBER', nullable: true },
          desconto: { type: 'NUMBER', nullable: true },
          valor_total: { type: 'NUMBER', nullable: true },
          ncm: { type: 'STRING', nullable: true },
          cfop: { type: 'STRING', nullable: true },
          cst_csosn: { type: 'STRING', nullable: true },
          icms: { type: 'STRING', nullable: true },
          pis: { type: 'STRING', nullable: true },
          cofins: { type: 'STRING', nullable: true },
        },
        required: ['descricao', 'quantidade', 'valor_unitario', 'valor_total'],
      },
    },
    valores: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        subtotal: { type: 'NUMBER', nullable: true },
        descontos: { type: 'NUMBER', nullable: true },
        acrescimos: { type: 'NUMBER', nullable: true },
        total: { type: 'NUMBER', nullable: true },
        forma_pagamento: { type: 'STRING', nullable: true },
        valor_pago: { type: 'NUMBER', nullable: true },
        troco: { type: 'NUMBER', nullable: true },
      },
    },
    informacoes_fiscais: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        ncm: { type: 'STRING', nullable: true },
        cfop: { type: 'STRING', nullable: true },
        cst_csosn: { type: 'STRING', nullable: true },
        icms: { type: 'STRING', nullable: true },
        pis: { type: 'STRING', nullable: true },
        cofins: { type: 'STRING', nullable: true },
      },
    },
    outras_informacoes: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        observacoes: { type: 'STRING', nullable: true },
        informacoes_complementares: { type: 'STRING', nullable: true },
      },
    },
    campos_extras: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          secao: { type: 'STRING', nullable: true },
          label: { type: 'STRING' },
          valor: { type: 'STRING', nullable: true },
          confianca: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
        },
        required: ['label', 'valor'],
      },
    },
    confianca_extracao: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
    alerta_reconciliacao: { type: 'BOOLEAN' },
    erro: { type: 'STRING', nullable: true },
  },
  required: [
    'origem',
    'tipo_documento',
    'tipo_documento_confianca',
    'itens',
    'confianca_extracao',
    'alerta_reconciliacao',
  ],
} as const;

const PROMPT = `Você faz EXTRAÇÃO DE DADOS para conferência fiscal e documental de comprovantes brasileiros a partir da imagem anexada.
Leia a imagem diretamente. Preserve toda informação relevante visível, mesmo que pequena, borrada ou parcialmente cortada.
Primeiro classifique o documento como NFC_E, CFE_SAT, NFE, RECIBO, COMPROVANTE_PAGAMENTO, OUTRO ou NAO_IDENTIFICADO.
Depois preencha os grupos aplicáveis ao tipo identificado: estabelecimento, documento fiscal, valores, itens, informações fiscais e outras informações.
Tente extrair cada informação visível e relevante, incluindo razão social, nome fantasia, CNPJ, IE, endereço, cidade/UF, número, série, datas, chave, protocolo, SAT, QR Code, subtotal, descontos, acréscimos, total, pagamento, valor pago, troco, NCM, CFOP, CST/CSOSN, ICMS, PIS, COFINS e observações.
Se um campo não existir no documento ou não puder ser identificado com segurança, use null. Nunca invente, complete, corrija ou estime um valor que não esteja visível na imagem.
Quando houver dúvida sobre um valor lido (dígito ambíguo, baixa resolução, reflexo), preserve o que conseguir ler em campos_extras, marque confiança baixa e alerta_reconciliacao true.
Preserve campos que não tenham lugar no schema em campos_extras, com a seção, o rótulo e o valor exatamente como detectados.
A chave de acesso só é válida com exatamente 44 dígitos numéricos consecutivos; caso contrário use null. Se os dígitos da chave estiverem minúsculos ou de difícil leitura, prefira marcar confiança baixa a arriscar um dígito incerto.
Nunca trate CNPJ, CPF, código de barras, protocolo ou chave como valor monetário.
Some os valores totais dos itens e compare com o total declarado. Diferença maior que 5% exige confiança baixa e alerta_reconciliacao true.
Se a imagem estiver ilegível, em branco, corrompida ou não for um comprovante/documento fiscal, use erro ocr_insuficiente, tipo NAO_IDENTIFICADO, confiança baixa e itens vazio.
Trate a imagem como um único comprovante e retorne somente o objeto JSON conforme o schema.
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
    const startedAt = Date.now();
    // O Paddle roda em paralelo só para decodificar código de barras/QR: a chave de
    // acesso lida de um barcode é exata, enquanto a mesma chave lida por visão (Gemini
    // ou OCR de texto) pode confundir dígitos parecidos. Uma falha aqui nunca deve
    // bloquear a leitura da imagem pelo Gemini.
    let paddleMs = 0;
    const paddlePromise = this.paddle
      .extract(input)
      .catch((): OcrExtractionResult => ({ status: 'FALHA', erro: 'paddle_indisponivel' }))
      .finally(() => {
        paddleMs = Date.now() - startedAt;
      });
    const imageBase64 = Buffer.from(input.fileData).toString('base64');

    const fallbackData = (
      erro: string,
      paddleFields?: OcrExtractionFields,
    ): OcrExtractionFields => ({
      ...(paddleFields ?? {}),
      confiancaExtracao: 'baixa',
      alertaReconciliacao: true,
      erro,
    });

    let lastFailureReason = 'Falha na leitura estruturada pelo Gemini.';
    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
      const attemptStartedAt = Date.now();
      const attemptResult = await this.attemptExtraction(
        input.fileName,
        imageBase64,
        input.fileType,
      );
      const attemptMs = Date.now() - attemptStartedAt;
      if (attemptResult.ok) {
        const paddleResult = await paddlePromise;
        const fields = toExtractionFields(
          attemptResult.cupom,
          paddleResult.data?.textoOriginal ?? '',
          paddleResult.data?.chaveAcesso,
        );
        logger.info('OCR Gemini: extração concluída', {
          fileName: input.fileName,
          model: this.model,
          attempt,
          geminiMs: attemptMs,
          paddleMs,
          totalMs: Date.now() - startedAt,
        });
        return fields.erro === 'ocr_insuficiente'
          ? { status: 'FALHA', erro: 'ocr_insuficiente', data: fields }
          : { status: 'SUCESSO', data: fields };
      }
      lastFailureReason = attemptResult.reason;
      logger.warn('OCR Gemini: tentativa falhou', {
        fileName: input.fileName,
        model: this.model,
        attempt,
        maxAttempts: GEMINI_MAX_ATTEMPTS,
        reason: attemptResult.reason,
        geminiMs: attemptMs,
      });
    }
    logger.error('OCR Gemini: todas as tentativas falharam', {
      fileName: input.fileName,
      model: this.model,
      attempts: GEMINI_MAX_ATTEMPTS,
      reason: lastFailureReason,
      totalMs: Date.now() - startedAt,
    });
    const paddleResult = await paddlePromise;
    return {
      status: 'FALHA',
      erro: 'Falha na leitura estruturada pelo Gemini.',
      data: fallbackData('Falha na leitura estruturada pelo Gemini.', paddleResult.data),
    };
  }

  private async attemptExtraction(
    fileName: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<{ ok: true; cupom: GeminiCupom } | { ok: false; reason: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(
        `${this.endpoint.replace(/\/$/, '')}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${PROMPT}\n\nMetadados:\n- arquivo: ${fileName}\n- pagina: 1\n- imagem_id: ${fileName}`,
                  },
                  { inline_data: { mime_type: mimeType, data: imageBase64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (!response.ok) {
        return { ok: false, reason: `HTTP ${response.status}` };
      }
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const jsonText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        return { ok: false, reason: 'resposta_vazia' };
      }
      try {
        return { ok: true, cupom: JSON.parse(jsonText) as GeminiCupom };
      } catch {
        return { ok: false, reason: 'json_invalido' };
      }
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'erro_rede';
      return { ok: false, reason };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toExtractionFields(
  cupom: GeminiCupom,
  rawText: string,
  paddleChaveAcesso: string | undefined,
): OcrExtractionFields {
  const total = finiteNumber(cupom.valores?.total);
  const itens = (cupom.itens ?? [])
    .filter((item) => typeof item.descricao === 'string' && item.descricao.trim())
    .map(
      (item): OcrExtractedItem => ({
        codigo: item.codigo ?? null,
        descricao: item.descricao!.trim(),
        quantidade: finiteNumber(item.quantidade) ?? null,
        unidade: item.unidade ?? null,
        valorUnitario: finiteNumber(item.valor_unitario) ?? null,
        valorTotal: finiteNumber(item.valor_total) ?? null,
        desconto: finiteNumber(item.desconto),
        ncm: item.ncm ?? null,
        cfop: item.cfop ?? null,
        cstCsosn: item.cst_csosn ?? null,
        icms: item.icms ?? null,
        pis: item.pis ?? null,
        cofins: item.cofins ?? null,
      }),
    );
  const knownItemTotals = itens.flatMap((item) =>
    item.valorTotal === null ? [] : item.valorTotal,
  );
  const itemSum = knownItemTotals.reduce((sum, value) => sum + value, 0);
  const alerta =
    total !== undefined &&
    total > 0 &&
    knownItemTotals.length > 0 &&
    Math.abs(itemSum - total) / total > 0.05;
  const data = parseDate(cupom.documento_fiscal?.data);
  const tipoDocumento = normalizeDocumentType(cupom.tipo_documento);
  const documento = cupom.documento_fiscal;
  const valores = cupom.valores;
  const estabelecimento = cupom.estabelecimento;
  const fiscais = cupom.informacoes_fiscais;
  const outras = cupom.outras_informacoes;
  const chave =
    typeof documento?.chave_acesso === 'string' && /^\d{44}$/.test(documento.chave_acesso)
      ? documento.chave_acesso
      : undefined;
  return {
    textoOriginal: rawText,
    tipoDocumento,
    tipoDocumentoConfianca: cupom.tipo_documento_confianca ?? 'media',
    estabelecimento: estabelecimento
      ? {
          razaoSocial: estabelecimento.razao_social ?? null,
          nomeFantasia: estabelecimento.nome_fantasia ?? null,
          cnpj: estabelecimento.cnpj ?? null,
          inscricaoEstadual: estabelecimento.inscricao_estadual ?? null,
          endereco: estabelecimento.endereco ?? null,
          cidadeUf: estabelecimento.cidade_uf ?? null,
        }
      : null,
    documentoFiscal: documento
      ? {
          tipo: documento.tipo ?? null,
          numero: documento.numero ?? null,
          serie: documento.serie ?? null,
          data: documento.data ?? null,
          hora: documento.hora ?? null,
          chaveAcesso: documento.chave_acesso ?? null,
          protocolo: documento.protocolo ?? null,
          numeroSat: documento.numero_sat ?? null,
          qrCode: documento.qr_code ?? null,
        }
      : null,
    valores: valores
      ? {
          subtotal: valores.subtotal ?? null,
          descontos: valores.descontos ?? null,
          acrescimos: valores.acrescimos ?? null,
          total: valores.total ?? null,
          formaPagamento: valores.forma_pagamento ?? null,
          valorPago: valores.valor_pago ?? null,
          troco: valores.troco ?? null,
        }
      : null,
    informacoesFiscais: fiscais
      ? {
          ncm: fiscais.ncm ?? null,
          cfop: fiscais.cfop ?? null,
          cstCsosn: fiscais.cst_csosn ?? null,
          icms: fiscais.icms ?? null,
          pis: fiscais.pis ?? null,
          cofins: fiscais.cofins ?? null,
        }
      : null,
    outrasInformacoes: outras
      ? {
          observacoes: outras.observacoes ?? null,
          informacoesComplementares: outras.informacoes_complementares ?? null,
        }
      : null,
    camposExtras: (cupom.campos_extras ?? [])
      .filter((item) => typeof item.label === 'string' && item.label.trim())
      .map((item) => ({
        secao: item.secao ?? null,
        label: item.label!.trim(),
        valor: item.valor === null || item.valor === undefined ? null : String(item.valor),
        confianca: item.confianca ?? null,
      })),
    cnpj: estabelecimento?.cnpj ?? undefined,
    nomeEstabelecimento: estabelecimento?.razao_social ?? undefined,
    nomeFantasia: estabelecimento?.nome_fantasia ?? undefined,
    endereco: estabelecimento?.endereco ?? undefined,
    cidadeUf: estabelecimento?.cidade_uf ?? undefined,
    data,
    hora: documento?.hora ?? undefined,
    valorTotal: total?.toFixed(2),
    valorProdutos: undefined,
    desconto: finiteNumber(valores?.descontos)?.toFixed(2),
    acrescimos: finiteNumber(valores?.acrescimos)?.toFixed(2),
    valorPago: finiteNumber(valores?.valor_pago)?.toFixed(2),
    troco: finiteNumber(valores?.troco)?.toFixed(2),
    numeroDocumento: documento?.numero ?? undefined,
    serie: documento?.serie ?? undefined,
    numeroSat: documento?.numero_sat ?? undefined,
    qrCode: documento?.qr_code ?? undefined,
    inscricaoEstadual: estabelecimento?.inscricao_estadual ?? undefined,
    protocoloAutorizacao: documento?.protocolo ?? undefined,
    // Chave decodificada de código de barras/QR (Paddle/pyzbar) é lida bit a bit e não
    // sofre confusão de dígitos parecidos como uma leitura visual; por isso tem
    // prioridade sobre a chave que o Gemini leu da imagem.
    chaveAcesso: paddleChaveAcesso ?? chave ?? documento?.chave_acesso ?? undefined,
    subtotal: finiteNumber(valores?.subtotal)?.toFixed(2),
    ncm: fiscais?.ncm ?? undefined,
    cfop: fiscais?.cfop ?? undefined,
    cstCsosn: fiscais?.cst_csosn ?? undefined,
    icms: fiscais?.icms ?? undefined,
    pis: fiscais?.pis ?? undefined,
    cofins: fiscais?.cofins ?? undefined,
    observacoes: outras?.observacoes ?? undefined,
    informacoesComplementares: outras?.informacoes_complementares ?? undefined,
    formaPagamento: valores?.forma_pagamento ?? undefined,
    itens,
    confiancaExtracao: alerta ? 'baixa' : (cupom.confianca_extracao ?? 'media'),
    alertaReconciliacao: alerta || cupom.alerta_reconciliacao === true,
    erro: cupom.erro ?? undefined,
  };
}

function normalizeDocumentType(value: string | null | undefined): OcrDocumentType {
  return value === 'NFC_E' ||
    value === 'CFE_SAT' ||
    value === 'NFE' ||
    value === 'RECIBO' ||
    value === 'COMPROVANTE_PAGAMENTO' ||
    value === 'OUTRO'
    ? value
    : 'NAO_IDENTIFICADO';
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
