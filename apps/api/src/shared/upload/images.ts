import sharp from 'sharp';
import { AppError } from '../errors/app-error.js';
import { MAX_UPLOAD_BYTES, type UploadedFile } from './files.js';

const MAX_IMAGE_DIMENSION = 2400;
const MAX_IMAGE_PIXELS = 40_000_000;

function invalidImage(): AppError {
  return new AppError(422, 'UPLOAD_CONTENT_INVALID', 'O conteúdo do comprovante não é uma imagem válida.');
}

function fileNameWithExtension(fileName: string, extension: 'jpg' | 'png'): string {
  const baseName = fileName.replace(/\.[^./\\]+$/, '');
  return `${baseName}.${extension}`;
}

export interface OptimizedImage {
  buffer: Buffer;
  originalname: string;
  mimetype: 'image/jpeg' | 'image/png';
  size: number;
}

export async function optimizeReceiptImage(file: UploadedFile): Promise<OptimizedImage> {
  if (!file || !file.buffer || file.buffer.length === 0) throw invalidImage();
  if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'UPLOAD_TOO_LARGE', 'Arquivo acima do tamanho máximo permitido.');
  }

  try {
    const source = sharp(file.buffer, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await source.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) throw invalidImage();
    if (!metadata.width || !metadata.height) throw invalidImage();
    if (metadata.pages && metadata.pages > 1) throw invalidImage();

    const image = source
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });

    const isPng = metadata.format === 'png';
    const buffer = isPng
      ? await image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer()
      : await image.jpeg({ quality: 88, progressive: true, mozjpeg: true }).toBuffer();
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new AppError(413, 'UPLOAD_TOO_LARGE', 'Arquivo otimizado acima do tamanho máximo permitido.');
    }

    return {
      buffer,
      originalname: fileNameWithExtension(file.originalname, isPng ? 'png' : 'jpg'),
      mimetype: isPng ? 'image/png' : 'image/jpeg',
      size: buffer.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalidImage();
  }
}