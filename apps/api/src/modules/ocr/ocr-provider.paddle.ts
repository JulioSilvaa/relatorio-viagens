import { logger } from '../../shared/logger.js';
import { hasRecognizedContent, hasSufficientOcrText, parseOcrText } from './ocr-parser.js';
import type { OcrExtractInput, OcrExtractionResult, OcrProvider } from './ocr.types.js';

export class PaddleOcrProvider implements OcrProvider {
  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs = 20000,
  ) {}

  async extract(input: OcrExtractInput): Promise<OcrExtractionResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const body = new FormData();
      body.set(
        'file',
        new Blob([Buffer.from(input.fileData)], { type: input.fileType }),
        input.fileName,
      );
      const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/ocr`, {
        method: 'POST',
        body,
        signal: controller.signal,
      });
      const paddleMs = Date.now() - startedAt;
      if (!response.ok) {
        logger.warn('OCR PaddleOCR: falha HTTP', {
          fileName: input.fileName,
          status: response.status,
          paddleMs,
        });
        return { status: 'FALHA', erro: 'Não foi possível processar o comprovante.' };
      }
      const payload = (await response.json()) as { text?: string; barcodes?: string[] };
      const rawText = payload.text ?? '';
      const chaveAcesso = findAccessKey(payload.barcodes ?? []);
      if (!hasSufficientOcrText(rawText)) {
        logger.info('OCR PaddleOCR: texto insuficiente', { fileName: input.fileName, paddleMs });
        return {
          status: 'FALHA',
          erro: 'ocr_insuficiente',
          data: {
            textoOriginal: rawText,
            chaveAcesso,
            itens: [],
            confiancaExtracao: 'baixa',
            alertaReconciliacao: false,
          },
        };
      }
      const fields = parseOcrText(rawText);
      fields.textoOriginal = rawText;
      fields.chaveAcesso ??= chaveAcesso;
      const recognized = hasRecognizedContent(fields);
      logger.info('OCR PaddleOCR: extração concluída', {
        fileName: input.fileName,
        status: recognized ? 'SUCESSO' : 'FALHA',
        paddleMs,
      });
      return recognized
        ? { status: 'SUCESSO', data: fields }
        : {
            status: 'FALHA',
            erro: 'ocr_insuficiente',
            data: { ...fields, confiancaExtracao: 'baixa', alertaReconciliacao: false },
          };
    } catch (error) {
      logger.error('OCR PaddleOCR: erro ao processar', {
        fileName: input.fileName,
        paddleMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: 'FALHA',
        erro: 'Falha na leitura do comprovante (OCR). Serviço OCR indisponível. Preencha os dados manualmente.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function findAccessKey(values: string[]): string | undefined {
  for (const value of values) {
    const match = value.match(/(?<!\d)\d{44}(?!\d)/);
    if (match) return match[0];
    const embedded = value.match(/(?:chNFe|chave)[^0-9]*(\d{44})(?!\d)/i);
    if (embedded?.[1]) return embedded[1];
  }
  return undefined;
}
