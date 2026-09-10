import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { z } from 'zod';
import type { ApproveReportService } from '../services/approve-report.service.js';
import type { ReturnReportService } from '../services/return-report.service.js';
import type { ChangeReimbursabilityService } from '../services/change-reimbursability.service.js';

export interface ApprovalsDeps {
  requireAuth: RequestHandler;
  approveReportService: ApproveReportService;
  returnReportService: ReturnReportService;
  changeReimbursabilityService: ChangeReimbursabilityService;
}

const returnReportSchema = z.object({
  justificativa: z.string().trim().min(3),
});

const approveReportSchema = z.object({
  taxaKm: z.coerce.number().positive('Taxa deve ser maior que zero').nullable().optional(),
});

const changeReimbursabilitySchema = z.object({
  reembolsavel: z.boolean(),
  justificativa: z.string().trim().min(3),
});

export function createApprovalsRouter({
  requireAuth,
  approveReportService,
  returnReportService,
  changeReimbursabilityService,
}: ApprovalsDeps): Router {
  const router = Router();

  router.post(
    '/:tripId/aprovar',
    requireAuth,
    requirePermission('RELATORIO.APROVAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = approveReportSchema.parse(req.body ?? {});
      await approveReportService.execute(req.params.tripId!, req.auth!.userId, dto);
      res.status(204).send();
    }),
  );

  router.post(
    '/:tripId/retornar',
    requireAuth,
    requirePermission('RELATORIO.RETORNAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = returnReportSchema.parse(req.body);
      await returnReportService.execute(req.params.tripId!, dto.justificativa, req.auth!.userId);
      res.status(204).send();
    }),
  );

  router.patch(
    '/expenses/:expenseId/reembolsabilidade',
    requireAuth,
    requirePermission('RELATORIO.APROVAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = changeReimbursabilitySchema.parse(req.body);
      const reembolsavel = await changeReimbursabilityService.execute(
        { expenseId: req.params.expenseId!, ...dto },
        req.auth!.userId,
      );
      res.json(success({ reembolsavel }));
    }),
  );

  return router;
}
