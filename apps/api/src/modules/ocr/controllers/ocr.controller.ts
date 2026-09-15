import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { FISCAL_READ_PERMISSION } from '../ocr.constants.js';
import type { ExtractReceiptOcrService } from '../services/extract-receipt-ocr.service.js';
import type { GetReceiptOcrService } from '../services/get-receipt-ocr.service.js';
import type { SaveReceiptOcrService } from '../services/save-receipt-ocr.service.js';
import type { OcrProvider } from '../ocr.types.js';
import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../../../shared/upload/files.js';
import { optimizeReceiptImage } from '../../../shared/upload/images.js';

export interface OcrDeps {
  requireAuth: RequestHandler;
  extractReceiptOcrService: ExtractReceiptOcrService;
  getReceiptOcrService: GetReceiptOcrService;
  saveReceiptOcrService: SaveReceiptOcrService;
  ocrProvider: OcrProvider;
}

const saveOcrSchema = z.object({
  cnpj: z.string().trim().max(18).optional(),
  nomeEstabelecimento: z.string().trim().max(200).optional(),
  data: z.coerce.date().optional(),
  hora: z.string().trim().max(8).optional(),
  valorTotal: z.coerce.number().nonnegative().optional(),
  numeroDocumento: z.string().trim().max(80).optional(),
  chaveAcesso: z.string().trim().max(80).optional(),
  itens: z
    .array(
      z.union([
        z.object({
          codigo: z.string().trim().nullable().optional(),
          descricao: z.string().trim().min(1),
          quantidade: z.coerce.number().positive().nullable().optional(),
          unidade: z.string().trim().nullable().optional(),
          valorUnitario: z.coerce.number().nonnegative().nullable().optional(),
          desconto: z.coerce.number().nonnegative().nullable().optional(),
          valorTotal: z.coerce.number().nonnegative().nullable().optional(),
          ncm: z.string().trim().nullable().optional(),
          cfop: z.string().trim().nullable().optional(),
          cstCsosn: z.string().trim().nullable().optional(),
          icms: z.string().trim().nullable().optional(),
          pis: z.string().trim().nullable().optional(),
          cofins: z.string().trim().nullable().optional(),
        }),
        z.object({ produto: z.string().trim().min(1) }).passthrough(),
      ]),
    )
    .max(500)
    .optional(),
  dadosOriginais: z
    .record(z.any())
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const serialized = JSON.stringify(value);
      if (serialized && Buffer.byteLength(serialized, 'utf8') > 64_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dadosOriginais excede o limite de 64KB.',
        });
      }
    }),
});

function canManageFiscal(req: { auth?: { user: { permissions: string[] } } }): boolean {
  return req.auth?.user.permissions.includes(FISCAL_READ_PERMISSION) ?? false;
}

function normalize(dfields: z.infer<typeof saveOcrSchema>) {
  return {
    cnpj: dfields.cnpj,
    nomeEstabelecimento: dfields.nomeEstabelecimento,
    data: dfields.data,
    hora: dfields.hora,
    valorTotal: dfields.valorTotal === undefined ? undefined : dfields.valorTotal.toFixed(2),
    numeroDocumento: dfields.numeroDocumento,
    chaveAcesso: dfields.chaveAcesso,
    itens: dfields.itens,
    dadosOriginais: dfields.dadosOriginais,
  };
}

export function createOcrRouter({
  requireAuth,
  extractReceiptOcrService,
  getReceiptOcrService,
  saveReceiptOcrService,
  ocrProvider,
}: OcrDeps): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });
  const uploadComprovante = upload.single('comprovante') as unknown as RequestHandler;

  router.get(
    '/receipts/:receiptId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const record = await getReceiptOcrService.execute(
        req.params.receiptId!,
        req.auth!.userId,
        canManageFiscal(req),
      );
      res.json(success(record));
    }),
  );

  router.post(
    '/pre-analisar',
    requireAuth,
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(422).json({
          error: { code: 'OCR_FILE_REQUIRED', message: 'Adicione um comprovante.' },
        });
        return;
      }
      const optimized = await optimizeReceiptImage(file);
      const result = await ocrProvider.extract({
        fileData: optimized.buffer,
        fileType: optimized.mimetype,
        fileName: optimized.originalname,
      });
      res.json(success(result));
    }),
  );

  router.post(
    '/receipts/:receiptId/extrair',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const record = await extractReceiptOcrService.execute(
        req.params.receiptId!,
        req.auth!.userId,
        canManageFiscal(req),
      );
      res.json(success(record));
    }),
  );

  router.put(
    '/receipts/:receiptId/dados',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = saveOcrSchema.parse(req.body);
      const record = await saveReceiptOcrService.execute(
        req.params.receiptId!,
        req.auth!.userId,
        canManageFiscal(req),
        normalize(parsed),
      );
      res.json(success(record));
    }),
  );

  return router;
}
