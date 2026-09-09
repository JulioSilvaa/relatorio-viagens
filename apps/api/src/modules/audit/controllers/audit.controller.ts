import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import type { ListAuditService } from '../services/list-audit.service.js';

export interface AuditDeps {
  requireAuth: RequestHandler;
  listAuditService: ListAuditService;
}

const MAX_LIMIT = 100;

export function createAuditRouter({ requireAuth, listAuditService }: AuditDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limite ?? 20) || 20, 1), MAX_LIMIT);
      const offset = Math.max(Number(req.query.deslocamento ?? 0) || 0, 0);
      const parseString = (value: unknown): string | undefined =>
        typeof value === 'string' && value.length > 0 ? value : undefined;

      const result = await listAuditService.execute({
        scopeUserId: req.auth!.userId,
        canViewGlobal: req.auth!.user.permissions.includes('AUDITORIA.CONSULTAR'),
        filters: {
          userId: parseString(req.query.usuarioId),
          entityType: parseString(req.query.entidade),
          entityId: parseString(req.query.entidadeId),
          operation: parseString(req.query.operacao),
          dateFrom: parseString(req.query.dataDe),
          dateTo: parseString(req.query.dataAte),
        },
        limit,
        offset,
      });
      res.json(success(result));
    }),
  );

  return router;
}
