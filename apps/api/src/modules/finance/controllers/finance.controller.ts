import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { MAX_UPLOAD_BYTES } from '../../../shared/upload/files.js';
import type { GetFinanceService } from '../services/get-finance.service.js';
import type { ReceiveFinanceService } from '../services/receive-finance.service.js';
import type { PayAdvanceService } from '../services/pay-advance.service.js';
import type { RegisterPaymentService } from '../services/register-payment.service.js';
import type { RegisterRefundService } from '../services/register-refund.service.js';
import type { RequestAdvanceService } from '../services/request-advance.service.js';
import type { ReviewAdvanceService } from '../services/review-advance.service.js';

export interface FinanceDeps {
  requireAuth: RequestHandler;
  receiveFinanceService: ReceiveFinanceService;
  registerPaymentService: RegisterPaymentService;
  requestAdvanceService: RequestAdvanceService;
  reviewAdvanceService: ReviewAdvanceService;
  payAdvanceService: PayAdvanceService;
  registerRefundService: RegisterRefundService;
  getFinanceService: GetFinanceService;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const uploadComprovante = upload.single('comprovante') as unknown as RequestHandler;

const receiveSchema = z.object({});
const paymentSchema = z.object({
  valor: z.coerce.number().nonnegative(),
  dataPagamento: z.coerce.date(),
  observacoes: z.string().trim().max(500).optional(),
});
const advanceRequestSchema = z.object({
  valorSolicitado: z.coerce.number().positive(),
  justificativaSolicitacao: z.string().trim().min(5).max(1000),
});
const advanceReviewSchema = z
  .object({
    aprovado: z.boolean(),
    valorAprovado: z.coerce.number().positive().nullable().optional(),
    justificativaAnalise: z.string().trim().min(2).max(1000),
  })
  .refine((value) => !value.aprovado || value.valorAprovado !== undefined, {
    message: 'Valor aprovado é obrigatório ao aprovar.',
    path: ['valorAprovado'],
  });
const advancePaymentSchema = z.object({
  observacoesPagamento: z.string().trim().max(500).optional(),
});
const refundSchema = z.object({
  valor: z.coerce.number().positive(),
  data: z.coerce.date(),
  metodoDePagamento: z.string().trim().min(3),
  observacoes: z.string().trim().max(500).optional(),
});

function fileOf(req: { file?: Express.Multer.File }) {
  if (!req.file) return null;
  return {
    data: req.file.buffer,
    nome: req.file.originalname,
    tipo: req.file.mimetype,
    tamanho: req.file.size,
  };
}

export function createFinanceRouter({
  requireAuth,
  receiveFinanceService,
  registerPaymentService,
  requestAdvanceService,
  reviewAdvanceService,
  payAdvanceService,
  registerRefundService,
  getFinanceService,
}: FinanceDeps): Router {
  const router = Router();

  router.get(
    '/trips/:tripId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const view = await getFinanceService.execute(
        req.params.tripId!,
        req.auth!.userId,
        req.auth!.user.permissions.includes('FINANCEIRO.REEMBOLSO.PROCESSAR'),
        req.auth!.user.roleCode === 'MANAGER_ADMIN',
      );
      res.json(success(view));
    }),
  );

  router.post(
    '/trips/:tripId/receber',
    requireAuth,
    requirePermission('FINANCEIRO.REEMBOLSO.PROCESSAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      receiveSchema.parse(req.body);
      await receiveFinanceService.execute(req.params.tripId!, req.auth!.userId);
      res.status(204).send();
    }),
  );

  router.post(
    '/trips/:tripId/pagamento',
    requireAuth,
    requirePermission('FINANCEIRO.REEMBOLSO.PROCESSAR'),
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = paymentSchema.parse(req.body);
      const payment = await registerPaymentService.execute(
        req.params.tripId!,
        {
          valor: parsed.valor.toString(),
          dataPagamento: parsed.dataPagamento,
          observacoes: parsed.observacoes ?? null,
          comprovante: fileOf(req),
        },
        req.auth!.userId,
      );
      res.json(success({ payment }));
    }),
  );

  router.post(
    '/trips/:tripId/adiantamento',
    requireAuth,
    requirePermission('ADIANTAMENTO.SOLICITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = advanceRequestSchema.parse(req.body);
      const advance = await requestAdvanceService.execute(
        req.params.tripId!,
        {
          valorSolicitado: parsed.valorSolicitado.toString(),
          justificativaSolicitacao: parsed.justificativaSolicitacao,
        },
        req.auth!.userId,
      );
      res.status(201).json(success({ advance }));
    }),
  );

  router.post(
    '/adiantamentos/:advanceId/analise',
    requireAuth,
    requirePermission('ADIANTAMENTO.ANALISAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = advanceReviewSchema.parse(req.body);
      const advance = await reviewAdvanceService.execute(
        req.params.advanceId!,
        {
          aprovado: parsed.aprovado,
          valorAprovado: parsed.valorAprovado?.toString() ?? null,
          justificativaAnalise: parsed.justificativaAnalise,
        },
        req.auth!.userId,
      );
      res.json(success({ advance }));
    }),
  );

  router.post(
    '/adiantamentos/:advanceId/pagamento',
    requireAuth,
    requirePermission('ADIANTAMENTO.PAGAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = advancePaymentSchema.parse(req.body);
      const advance = await payAdvanceService.execute(
        req.params.advanceId!,
        { observacoesPagamento: parsed.observacoesPagamento ?? null },
        req.auth!.userId,
      );
      res.json(success({ advance }));
    }),
  );

  router.post(
    '/trips/:tripId/devolucao',
    requireAuth,
    requirePermission('FINANCEIRO.REEMBOLSO.PROCESSAR'),
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = refundSchema.parse(req.body);
      const refund = await registerRefundService.execute(
        req.params.tripId!,
        {
          valor: parsed.valor.toString(),
          data: parsed.data,
          metodoDePagamento: parsed.metodoDePagamento,
          observacoes: parsed.observacoes ?? null,
          comprovante: fileOf(req),
        },
        req.auth!.userId,
      );
      res.json(success({ refund }));
    }),
  );

  return router;
}
