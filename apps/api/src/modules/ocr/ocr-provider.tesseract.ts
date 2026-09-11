import { createWorker, type Worker } from 'tesseract.js';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../shared/logger.js';
import { hasRecognizedContent, parseOcrText } from './ocr-parser.js';
import type { OcrExtractInput, OcrExtractionResult, OcrProvider } from './ocr.types.js';

const NEUTRAL_FALLBACK_MESSAGE =
  'Falha na leitura do comprovante (OCR). Confira a imagem ou preencha os dados manualmente.';

const FILE_SIGNATURES: Array<{ label: string; test: (bytes: Uint8Array) => boolean }> = [
  {
    label: 'png',
    test: (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    label: 'jpeg',
    test: (bytes) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    label: 'gif',
    test: (bytes) =>
      bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38,
  },
  { label: 'bmp', test: (bytes) => bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d },
  {
    label: 'tiff',
    test: (bytes) =>
      (bytes.length >= 4 &&
        bytes[0] === 0x49 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x2a &&
        bytes[3] === 0x00) ||
      (bytes.length >= 4 &&
        bytes[0] === 0x4d &&
        bytes[1] === 0x4d &&
        bytes[2] === 0x00 &&
        bytes[3] === 0x2a),
  },
  {
    label: 'webp',
    test: (bytes) =>
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50,
  },
  {
    label: 'pdf',
    test: (bytes) =>
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46,
  },
];

function isReadableImage(bytes: Uint8Array): boolean {
  return FILE_SIGNATURES.some(({ test }) => test(bytes));
}

export interface TesseractOcrProviderOptions {
  langPath?: string;
  cachePath?: string;
  timeoutMs?: number;
}

export class TesseractOcrProvider implements OcrProvider {
  private workerPromise: Promise<Worker> | null = null;

  constructor(private readonly options: TesseractOcrProviderOptions = {}) {}

  private async getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      const cachePath = this.options.cachePath ?? join(tmpdir(), 'tesseract-ocr');
      if (!existsSync(cachePath)) {
        mkdirSync(cachePath, { recursive: true });
      }
      this.workerPromise = createWorker(['por'], 1, {
        cachePath,
        ...(this.options.langPath ? { langPath: this.options.langPath } : {}),
      }).catch((error: unknown) => {
        this.workerPromise = null;
        throw error;
      });
    }
    return this.workerPromise;
  }

  async extract(input: OcrExtractInput): Promise<OcrExtractionResult> {
    if (!isReadableImage(input.fileData)) {
      return { status: 'FALHA', erro: NEUTRAL_FALLBACK_MESSAGE };
    }
    const timeoutMs = this.options.timeoutMs ?? 20000;
    try {
      const worker = await this.getWorker();
      const result = await withTimeout(worker.recognize(new Uint8Array(input.fileData)), timeoutMs);
      const fields = parseOcrText(result.data.text ?? '');
      if (!hasRecognizedContent(fields)) {
        return { status: 'FALHA', erro: NEUTRAL_FALLBACK_MESSAGE };
      }
      return { status: 'SUCESSO', data: fields };
    } catch (error) {
      logger.warn('Falha ao executar OCR no comprovante', {
        fileName: input.fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: 'FALHA', erro: NEUTRAL_FALLBACK_MESSAGE };
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`OCR excedeu o tempo limite de ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
