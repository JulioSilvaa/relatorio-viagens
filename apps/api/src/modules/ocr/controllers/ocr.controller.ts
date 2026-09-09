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

export interface OcrDeps {
  requireAuth: RequestHandler;
  extractReceiptOcrService: ExtractReceiptOcrService;
  getReceiptOcrService: GetReceiptOcrService;
  saveReceiptOcrService: SaveReceiptOcrService;
}

const saveOcrSchema = z.object({
  cnpj: z.string().trim().max(18).optional(),
  nomeEstabelecimento: z.string().trim().max(200).optional(),
  data: z.coerce.date().optional(),
  hora: z.string().trim().max(8).optional(),
  valorTotal: z.coerce.number().nonnegative().optional(),
  numeroDocumento: z.string().trim().max(80).optional(),
  chaveAcesso: z.string().trim().max(80).optional(),
  itens: z.array(z.record(z.any())).optional(),
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
  };
}

export function createOcrRouter({
  requireAuth,
  extractReceiptOcrService,
  getReceiptOcrService,
  saveReceiptOcrService,
}: OcrDeps): Router {
  const router = Router();

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
