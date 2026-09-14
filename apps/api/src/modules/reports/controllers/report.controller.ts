import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import type { GenerateManagerPdfService } from '../services/generate-manager-pdf.service.js';
import type { GenerateOfficialPdfService } from '../services/generate-official-pdf.service.js';

export interface ReportsDeps {
  requireAuth: RequestHandler;
  generateOfficialPdfService: GenerateOfficialPdfService;
  generateManagerPdfService: GenerateManagerPdfService;
}

function canViewAny(request: {
  auth?: { user: { roleCode: string; permissions: string[] } };
}): boolean {
  return request.auth!.user.permissions.includes('RELATORIO.PDF.GERAR');
}

export function createReportsRouter({
  requireAuth,
  generateOfficialPdfService,
  generateManagerPdfService,
}: ReportsDeps): Router {
  const router = Router();

  router.get(
    '/trips/:tripId/oficial',
    requireAuth,
    asyncHandler(async (req, res) => {
      const anexarComprovantes =
        req.query.anexarComprovantes === '1' || req.query.anexarComprovantes === 'true';
      const report = await generateOfficialPdfService.execute(
        req.params.tripId!,
        req.auth!.userId,
        canViewAny(req),
        req.auth!.user.name,
        anexarComprovantes,
        req.auth!.user.companyId,
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.fileName}"`,
        'Content-Length': String(report.content.length),
      });
      res.send(report.content);
    }),
  );

  router.get(
    '/trips/:tripId/gerencial',
    requireAuth,
    asyncHandler(async (req, res) => {
      const report = await generateManagerPdfService.execute(
        req.params.tripId!,
        req.auth!.userId,
        canViewAny(req),
        req.auth!.user.name,
        req.auth!.user.companyId,
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.fileName}"`,
        'Content-Length': String(report.content.length),
      });
      res.send(report.content);
    }),
  );

  return router;
}
