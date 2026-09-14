import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import type { EmployeeDashboardService } from '../services/employee-dashboard.service.js';
import type { ManagerDashboardService } from '../services/manager-dashboard.service.js';

export interface DashboardDeps {
  requireAuth: RequestHandler;
  managerDashboardService: ManagerDashboardService;
  employeeDashboardService: EmployeeDashboardService;
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function createDashboardRouter({
  requireAuth,
  managerDashboardService,
  employeeDashboardService,
}: DashboardDeps): Router {
  const router = Router();

  router.get(
    '/gerencial',
    requireAuth,
    asyncHandler(async (req, res) => {
      const report = await managerDashboardService.execute(
        req.auth!.user.permissions.includes('DASHBOARD.GERENCIAL'),
        {
          dataDe: parseString(req.query.dataDe),
          dataAte: parseString(req.query.dataAte),
          departamento: parseString(req.query.departamento),
          categoriaCode: parseString(req.query.categoria),
          status: parseString(req.query.status),
          centroDeCustoId: parseString(req.query.centroDeCustoId),
          colaboradorId: parseString(req.query.colaboradorId),
          cidade: parseString(req.query.cidade),
          cliente: parseString(req.query.cliente),
        },
        req.auth!.user.companyId,
      );
      res.json(success(report));
    }),
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const report = await employeeDashboardService.execute(req.auth!.userId);
      res.json(success(report));
    }),
  );

  return router;
}
