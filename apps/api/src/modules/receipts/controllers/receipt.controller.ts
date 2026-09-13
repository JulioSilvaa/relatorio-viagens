import { Router } from 'express';
import multer from 'multer';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { safeDispositionFilename } from '../../../shared/http/content-disposition.js';
import { MAX_UPLOAD_BYTES } from '../../../shared/upload/files.js';
import { receiptUploadSchema } from '../../expenses/schemas/expense.schema.js';
import type { UploadReceiptService } from '../services/upload-receipt.service.js';
import type { SubstituteReceiptService } from '../services/substitute-receipt.service.js';
import type { GetReceiptFileService } from '../services/get-receipt-file.service.js';

export interface ReceiptsDeps {
  requireAuth: RequestHandler;
  uploadReceiptService: UploadReceiptService;
  substituteReceiptService: SubstituteReceiptService;
  getReceiptFileService: GetReceiptFileService;
  onReceiptCreated: (receiptId: string, actorId: string) => void;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const uploadComprovante = upload.single('comprovante') as unknown as RequestHandler;

export function createReceiptsRouter({
  requireAuth,
  uploadReceiptService,
  substituteReceiptService,
  getReceiptFileService,
  onReceiptCreated,
}: ReceiptsDeps): Router {
  const router = Router();

  router.post(
    '/expenses/:expenseId/receipts',
    requireAuth,
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = receiptUploadSchema.parse(req.body);
      const file = req.file as Express.Multer.File | undefined;
      const receipt = await uploadReceiptService.execute({
        expenseId: req.params.expenseId!,
        file: file!,
        tipo: dto.tipoComprovante,
        actorId: req.auth!.userId,
      });
      res.status(201).json(success({ receipt }));
      onReceiptCreated(receipt.id, req.auth!.userId);
    }),
  );

  router.post(
    '/expenses/:expenseId/receipts/:receiptId/substituir',
    requireAuth,
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = receiptUploadSchema.parse(req.body);
      const file = req.file as Express.Multer.File | undefined;
      const receipt = await substituteReceiptService.execute({
        expenseId: req.params.expenseId!,
        receiptId: req.params.receiptId!,
        file: file!,
        tipo: dto.tipoComprovante,
        actorId: req.auth!.userId,
      });
      res.json(success({ receipt }));
      onReceiptCreated(receipt.id, req.auth!.userId);
    }),
  );

  router.get(
    '/receipts/:receiptId/arquivo',
    requireAuth,
    asyncHandler(async (req, res) => {
      const canViewAny =
        req.auth!.user.roleCode === 'MANAGER_ADMIN' ||
        req.auth!.user.permissions.includes('RELATORIO.VISUALIZAR');
      const result = await getReceiptFileService.execute(
        req.params.receiptId!,
        req.auth!.userId,
        canViewAny,
      );
      res.set('Content-Type', result.fileType);
      res.set(
        'Content-Disposition',
        `inline; filename="${safeDispositionFilename(result.fileName)}"`,
      );
      res.send(Buffer.from(result.fileData));
    }),
  );

  return router;
}
