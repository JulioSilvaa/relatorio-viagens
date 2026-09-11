import { createWorker, type Worker } from 'tesseract.js';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../shared/logger.js';
import { hasRecognizedContent, parseOcrText } from './ocr-parser.js';
import type { OcrExtractInput, OcrExtractionResult, OcrProvider } from './ocr.types.js';

const NEUTRAL_FALLBACK_MESSAGE =
  'Falha na leitura do comprovante (OCR). Confira a imagem ou preencha os dados manualmente.';

const PDF_UNSUPPORTED_MESSAGE =
  'Comprovante PDF não suportado pela leitura automática. Preencha os dados manualmente.';

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || !signature.every((value, index) => bytes[index] === value)) {
    return false;
  }
  const iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44];
  return (
    bytes.length >= 20 && iend.every((value, index) => bytes[bytes.length - 12 + index] === value)
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return false;
  }
  const tail = bytes.subarray(Math.max(0, bytes.length - 64));
  for (let index = tail.length - 2; index >= 0; index -= 1) {
    if (tail[index] === 0xff && tail[index + 1] === 0xd9) return true;
  }
  return false;
}

function isWebp(bytes: Uint8Array): boolean {
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  const vp8 = bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38;
  return (
    bytes.length >= 20 &&
    riff.every((value, index) => bytes[index] === value) &&
    webp.every((value, index) => bytes[8 + index] === value) &&
    vp8
  );
}

function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

type ImageValidation = 'ok' | 'unsupported' | 'not-an-image';

function validateInput(bytes: Uint8Array): ImageValidation {
  if (isPdf(bytes)) return 'unsupported';
  if (isPng(bytes)) return 'ok';
  if (isJpeg(bytes)) return 'ok';
  if (isWebp(bytes)) return 'ok';
  return 'not-an-image';
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
    const validation = validateInput(new Uint8Array(input.fileData));
    if (validation === 'unsupported') {
      return { status: 'FALHA', erro: PDF_UNSUPPORTED_MESSAGE };
    }
    if (validation === 'not-an-image') {
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
