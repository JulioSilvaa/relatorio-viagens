import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';

export const ALLOWED_UPLOAD_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function isAllowedMime(mimetype: string): boolean {
  return (ALLOWED_UPLOAD_MIMES as readonly string[]).includes(mimetype);
}

export function assertValidUpload(file: UploadedFile): void {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new AppError(422, 'UPLOAD_FILE_REQUIRED', 'Comprovante obrigatório.');
  }
  if (!isAllowedMime(file.mimetype)) {
    throw new AppError(422, 'UPLOAD_TYPE_NOT_ALLOWED', 'Tipo de arquivo não permitido.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'UPLOAD_TOO_LARGE', 'Arquivo acima do tamanho máximo permitido.');
  }
}
