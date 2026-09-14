import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { CreateCreditCardService } from '../services/create-credit-card.service.js';
import type { ListCreditCardsService } from '../services/list-credit-cards.service.js';
import type { UpdateCreditCardService } from '../services/update-credit-card.service.js';
import type { UpdateCreditCardStatusService } from '../services/update-credit-card-status.service.js';

const createCreditCardSchema = z.object({
  cardholderName: z.string().trim().min(2).max(200),
  cardNumber: z.string().trim().min(13).max(25),
  brand: z.string().trim().max(50).nullish(),
});

const updateCreditCardSchema = createCreditCardSchema.partial().extend({
  cardholderName: z.string().trim().min(2).max(200),
  cardNumber: z.string().trim().min(13).max(25).optional(),
});

const updateStatusSchema = z.object({ active: z.boolean() });

export interface CreditCardDeps {
  createCreditCardService: CreateCreditCardService;
  listCreditCardsService: ListCreditCardsService;
  updateCreditCardService: UpdateCreditCardService;
  updateCreditCardStatusService: UpdateCreditCardStatusService;
  requireAuth: RequestHandler;
}

export function createCreditCardRouter({
  createCreditCardService,
  listCreditCardsService,
  updateCreditCardService,
  updateCreditCardStatusService,
  requireAuth,
}: CreditCardDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('CARTAO.VISUALIZAR'),
    asyncHandler(async (req, res) => {
      const cards = await listCreditCardsService.execute(req.auth!.user.companyId);
      res.json(success({ cards }));
    }),
  );

  router.get(
    '/disponiveis',
    requireAuth,
    requirePermission('VIAGEM.CARTAO.SELECIONAR'),
    asyncHandler(async (req, res) => {
      const cards = await listCreditCardsService.executeActive(req.auth!.user.companyId);
      res.json(success({ cards }));
    }),
  );

  router.post(
    '/',
    requireAuth,
    requirePermission('CARTAO.CRIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const input = createCreditCardSchema.parse(req.body);
      const card = await createCreditCardService.execute(
        input,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.status(201).json(success({ card }));
    }),
  );

  router.put(
    '/:id',
    requireAuth,
    requirePermission('CARTAO.EDITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const input = updateCreditCardSchema.parse(req.body);
      const card = await updateCreditCardService.execute(
        req.params.id!,
        input,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ card }));
    }),
  );

  router.patch(
    '/:id/status',
    requireAuth,
    requirePermission('CARTAO.DESATIVAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const { active } = updateStatusSchema.parse(req.body);
      const card = await updateCreditCardStatusService.execute(
        req.params.id!,
        active,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ card }));
    }),
  );

  return router;
}
