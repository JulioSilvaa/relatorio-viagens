import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { optimizeReceiptImage } from '../../src/shared/upload/images.js';

function uploaded(buffer: Buffer, mimetype: string, originalname = 'comprovante.ext') {
  return { buffer, mimetype, originalname, size: buffer.length };
}

describe('optimizeReceiptImage', () => {
  it('redimensiona imagens grandes sem ampliar imagens pequenas', async () => {
    const large = await sharp({
      create: { width: 3200, height: 1800, channels: 3, background: '#ffffff' },
    }).jpeg().toBuffer();
    const small = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#ffffff' },
    }).jpeg().toBuffer();

    const optimizedLarge = await optimizeReceiptImage(uploaded(large, 'image/jpeg', 'grande.jpg'));
    const optimizedSmall = await optimizeReceiptImage(uploaded(small, 'image/jpeg', 'pequeno.jpg'));
    const largeMetadata = await sharp(optimizedLarge.buffer).metadata();
    const smallMetadata = await sharp(optimizedSmall.buffer).metadata();

    expect(largeMetadata.width).toBe(2400);
    expect(largeMetadata.height).toBe(1350);
    expect(smallMetadata.width).toBe(800);
    expect(smallMetadata.height).toBe(600);
    expect(optimizedLarge.mimetype).toBe('image/jpeg');
    expect(optimizedLarge.originalname).toBe('grande.jpg');
  });

  it('converte WebP para JPEG compatível com o PDF', async () => {
    const webp = await sharp({
      create: { width: 900, height: 700, channels: 3, background: '#ffffff' },
    }).webp().toBuffer();

    const optimized = await optimizeReceiptImage(uploaded(webp, 'image/webp', 'comprovante.webp'));
    const metadata = await sharp(optimized.buffer).metadata();

    expect(metadata.format).toBe('jpeg');
    expect(optimized.mimetype).toBe('image/jpeg');
    expect(optimized.originalname).toBe('comprovante.jpg');
  });

  it('rejeita bytes que não são uma imagem real', async () => {
    await expect(
      optimizeReceiptImage(uploaded(Buffer.from('arquivo falso'), 'image/png', 'falso.png')),
    ).rejects.toMatchObject({ code: 'UPLOAD_CONTENT_INVALID', statusCode: 422 });
  });

});
