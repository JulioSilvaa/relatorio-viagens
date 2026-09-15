import type { OcrExtractInput, OcrExtractionResult, OcrProvider } from './ocr.types.js';

/**
 * Auxiliar do GeminiOcrProvider: decodifica só o código de barras/QR (via pyzbar),
 * sem rodar o pipeline pesado de reconhecimento de texto do PaddleOCR, que o fluxo
 * Gemini não consome (o Gemini lê a imagem diretamente).
 */
export class PaddleBarcodeProvider implements OcrProvider {
  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs = 20000,
  ) {}

  async extract(input: OcrExtractInput): Promise<OcrExtractionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const body = new FormData();
      body.set(
        'file',
        new Blob([Buffer.from(input.fileData)], { type: input.fileType }),
        input.fileName,
      );
      const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/barcode`, {
        method: 'POST',
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        return { status: 'FALHA', erro: 'barcode_indisponivel' };
      }
      const payload = (await response.json()) as { barcodes?: string[] };
      const chaveAcesso = findAccessKey(payload.barcodes ?? []);
      return { status: 'SUCESSO', data: { chaveAcesso, itens: [] } };
    } catch {
      return { status: 'FALHA', erro: 'barcode_indisponivel' };
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
