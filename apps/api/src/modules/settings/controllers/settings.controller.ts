import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { updateSettingsSchema } from '../schemas/update-settings.schema.js';
import type { KmRateService } from '../services/km-rate.service.js';

export interface SettingsDeps {
  requireAuth: RequestHandler;
  kmRateService: KmRateService;
}

export function createSettingsRouter({ requireAuth, kmRateService }: SettingsDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('CONFIG.SISTEMA.GERENCIAR'),
    asyncHandler(async (_req, res) => {
      res.json(success({ settings: await kmRateService.view() }));
    }),
  );

  router.put(
    '/',
    requireAuth,
    requirePermission('CONFIG.SISTEMA.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = updateSettingsSchema.parse(req.body);
      await kmRateService.set(String(dto.kmReimbursementRate));
      res.json(success({ settings: await kmRateService.view() }));
    }),
  );

  return router;
}
