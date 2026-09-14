import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { ListCostCentersService } from '../services/list-cost-centers.service.js';
import type { CreateCostCenterService } from '../services/create-cost-center.service.js';
import type { UpdateCostCenterService } from '../services/update-cost-center.service.js';

export interface CostCentersDeps {
  requireAuth: RequestHandler;
  listCostCentersService: ListCostCentersService;
  createCostCenterService: CreateCostCenterService;
  updateCostCenterService: UpdateCostCenterService;
}

const costCenterSchema = z.object({
  nome: z.string().trim().min(1).max(100),
});

const updateCostCenterSchema = z.object({
  nome: z.string().trim().min(1).max(100).optional(),
  ativo: z.boolean().optional(),
});

export function createCostCentersRouter({
  requireAuth,
  listCostCentersService,
  createCostCenterService,
  updateCostCenterService,
}: CostCentersDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('CONFIG.CENTRO_CUSTO.VISUALIZAR'),
    asyncHandler(async (req, res) => {
      const includeInactive = req.auth!.user.roleCode === 'MANAGER_ADMIN';
      res.json(
        success({
          centers: await listCostCentersService.execute(includeInactive, req.auth!.user.companyId),
        }),
      );
    }),
  );

  router.post(
    '/',
    requireAuth,
    requirePermission('CONFIG.CENTRO_CUSTO.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = costCenterSchema.parse(req.body);
      const center = await createCostCenterService.execute(
        dto.nome,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.status(201).json(success({ center }));
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    requirePermission('CONFIG.CENTRO_CUSTO.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = updateCostCenterSchema.parse(req.body);
      const center = await updateCostCenterService.execute(
        req.params.id!,
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ center }));
    }),
  );

  return router;
}
