import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { AddParticipantService } from '../services/add-participant.service.js';
import type { CancelTripService } from '../services/cancel-trip.service.js';
import type { CreateTripService } from '../services/create-trip.service.js';
import type { DeleteTripService } from '../services/delete-trip.service.js';
import type { DeliverReportService } from '../services/deliver-report.service.js';
import type { EditTripService } from '../services/edit-trip.service.js';
import type { GetTripService } from '../services/get-trip.service.js';
import type { ListTripsService } from '../services/list-trips.service.js';
import type { RemoveParticipantService } from '../services/remove-participant.service.js';
import type { SearchTripsService } from '../services/search-trips.service.js';
import {
  addParticipantSchema,
  cancelTripSchema,
  createTripSchema,
  updateTripSchema,
} from '../schemas/trip.schema.js';

export interface TripsDeps {
  requireAuth: RequestHandler;
  createTripService: CreateTripService;
  listTripsService: ListTripsService;
  getTripService: GetTripService;
  editTripService: EditTripService;
  addParticipantService: AddParticipantService;
  removeParticipantService: RemoveParticipantService;
  deliverReportService: DeliverReportService;
  cancelTripService: CancelTripService;
  deleteTripService: DeleteTripService;
  searchTripsService: SearchTripsService;
}

const MAX_HISTORICO_LIMIT = 100;

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function createTripsRouter({
  requireAuth,
  createTripService,
  listTripsService,
  getTripService,
  editTripService,
  addParticipantService,
  removeParticipantService,
  deliverReportService,
  cancelTripService,
  deleteTripService,
  searchTripsService,
}: TripsDeps): Router {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requirePermission('VIAGEM.CRIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = createTripSchema.parse(req.body);
      const trip = await createTripService.execute(dto, {
        id: req.auth!.userId,
        name: req.auth!.user.name,
      });
      res.status(201).json(success({ trip }));
    }),
  );

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const trips = await listTripsService.execute(req.auth!.userId, req.auth!.user.roleCode);
      res.json(success({ trips }));
    }),
  );

  router.get(
    '/historico',
    requireAuth,
    asyncHandler(async (req, res) => {
      const limit = Math.min(
        Math.max(Number(req.query.limite ?? 20) || 20, 1),
        MAX_HISTORICO_LIMIT,
      );
      const offset = Math.max(Number(req.query.deslocamento ?? 0) || 0, 0);
      const result = await searchTripsService.execute(
        req.auth!.userId,
        req.auth!.user.roleCode === 'MANAGER_ADMIN',
        {
          id: parseQueryString(req.query.numeroRelatorio),
          dataDe: parseQueryString(req.query.dataDe),
          dataAte: parseQueryString(req.query.dataAte),
          cliente: parseQueryString(req.query.cliente),
          cidade: parseQueryString(req.query.cidade),
          colaboradorId: parseQueryString(req.query.colaboradorId),
          status: parseQueryString(req.query.status),
          departamento: parseQueryString(req.query.departamento),
          centroDeCustoId: parseQueryString(req.query.centroDeCustoId),
        },
        limit,
        offset,
      );
      res.json(success(result));
    }),
  );

  router.get(
    '/:tripId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const canViewAny =
        req.auth!.user.roleCode === 'MANAGER_ADMIN' ||
        req.auth!.user.permissions.includes('RELATORIO.VISUALIZAR');
      const trip = await getTripService.execute(req.params.tripId!, req.auth!.userId, canViewAny);
      res.json(success({ trip }));
    }),
  );

  router.patch(
    '/:tripId',
    requireAuth,
    requirePermission('VIAGEM.EDITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = updateTripSchema.parse(req.body);
      const trip = await editTripService.execute(req.params.tripId!, dto, req.auth!.userId);
      res.json(success({ trip }));
    }),
  );

  router.post(
    '/:tripId/participants',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = addParticipantSchema.parse(req.body);
      const participant = await addParticipantService.execute(
        req.params.tripId!,
        dto,
        req.auth!.userId,
        req.auth!.user.roleCode,
      );
      res.status(201).json(success({ participant }));
    }),
  );

  router.delete(
    '/:tripId/participants/:userId',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      await removeParticipantService.execute(
        req.params.tripId!,
        req.params.userId!,
        req.auth!.userId,
        req.auth!.user.roleCode,
      );
      res.status(204).send();
    }),
  );

  router.post(
    '/:tripId/entregar',
    requireAuth,
    requirePermission('VIAGEM.ENTREGAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      await deliverReportService.execute(req.params.tripId!, req.auth!.userId);
      res.status(204).send();
    }),
  );

  router.post(
    '/:tripId/cancelar',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = cancelTripSchema.parse(req.body);
      const trip = await cancelTripService.execute(
        req.params.tripId!,
        dto.motivo,
        req.auth!.userId,
        req.auth!.user.roleCode,
      );
      res.json(success({ trip }));
    }),
  );

  router.delete(
    '/:tripId',
    requireAuth,
    requirePermission('VIAGEM.EXCLUIR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      await deleteTripService.execute(req.params.tripId!, req.auth!.userId);
      res.status(204).send();
    }),
  );

  return router;
}
