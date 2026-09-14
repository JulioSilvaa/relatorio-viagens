import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import type { GenerateExpensesExcelService } from '../services/generate-expenses-excel.service.js';

export interface ExportsDeps {
  requireAuth: RequestHandler;
  generateExpensesExcelService: GenerateExpensesExcelService;
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function createExportsRouter({
  requireAuth,
  generateExpensesExcelService,
}: ExportsDeps): Router {
  const router = Router();

  router.get(
    '/despesas',
    requireAuth,
    asyncHandler(async (req, res) => {
      const excel = await generateExpensesExcelService.execute(
        req.auth!.user.roleCode === 'MANAGER_ADMIN',
        req.auth!.userId,
        req.auth!.user.companyId,
        {
          dataDe: parseString(req.query.dataDe),
          dataAte: parseString(req.query.dataAte),
          cliente: parseString(req.query.cliente),
          cidade: parseString(req.query.cidade),
          colaboradorId: parseString(req.query.colaboradorId),
          status: parseString(req.query.status),
          departamento: parseString(req.query.departamento),
          centroDeCustoId: parseString(req.query.centroDeCustoId),
        },
      );
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${excel.fileName}"`,
        'Content-Length': String(excel.content.length),
      });
      res.send(excel.content);
    }),
  );

  return router;
}
