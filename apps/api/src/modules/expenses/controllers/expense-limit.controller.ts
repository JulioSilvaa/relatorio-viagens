import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { configureLimitSchema } from '../schemas/expense.schema.js';
import type { ListLimitsService } from '../services/list-limits.service.js';
import type { ConfigureLimitService } from '../services/configure-limit.service.js';

export interface ExpenseLimitsDeps {
  requireAuth: RequestHandler;
  listLimitsService: ListLimitsService;
  configureLimitService: ConfigureLimitService;
}

export function createExpenseLimitsRouter({
  requireAuth,
  listLimitsService,
  configureLimitService,
}: ExpenseLimitsDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('RELATORIO.VISUALIZAR'),
    asyncHandler(async (req, res) => {
      res.json(success({ limits: await listLimitsService.execute() }));
    }),
  );

  router.put(
    '/categories/:categoryId',
    requireAuth,
    requirePermission('CONFIG.LIMITE.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = configureLimitSchema.parse(req.body);
      const limit = await configureLimitService.execute(
        req.params.categoryId!,
        dto.valor,
        req.auth!.userId,
      );
      res.json(success({ limit }));
    }),
  );

  return router;
}
