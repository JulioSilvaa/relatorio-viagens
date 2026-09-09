import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { GetExpenseFiscalService } from '../services/get-expense-fiscal.service.js';
import type { ValidateExpenseService } from '../services/validate-expense.service.js';

export interface FiscalDeps {
  requireAuth: RequestHandler;
  validateExpenseService: ValidateExpenseService;
  getExpenseFiscalService: GetExpenseFiscalService;
}

const validateSchema = z
  .object({
    status: z.enum(['VALIDO', 'PROBLEMA']),
    motivo: z.string().trim().min(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'PROBLEMA' && !data.motivo) {
      ctx.addIssue({ code: 'custom', message: 'Motivo é obrigatório para problema fiscal.' });
    }
  });

export function createFiscalRouter({
  requireAuth,
  validateExpenseService,
  getExpenseFiscalService,
}: FiscalDeps): Router {
  const router = Router();

  router.get(
    '/expenses/:expenseId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const canManageFiscal = req.auth!.user.permissions.includes('FISCAL.DOCUMENTO.VALIDAR');
      const record = await getExpenseFiscalService.execute(
        req.params.expenseId!,
        req.auth!.userId,
        canManageFiscal,
      );
      res.json(success(record));
    }),
  );

  router.patch(
    '/expenses/:expenseId',
    requireAuth,
    requirePermission('FISCAL.DOCUMENTO.VALIDAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const parsed = validateSchema.parse(req.body);
      const record = await validateExpenseService.execute(
        req.params.expenseId!,
        parsed.status,
        parsed.motivo ?? null,
        req.auth!.userId,
      );
      res.json(success(record));
    }),
  );

  return router;
}
