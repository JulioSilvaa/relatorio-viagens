import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { CreateUserService } from '../services/create-user.service.js';
import type { ListUsersService } from '../services/list-users.service.js';
import type { UpdateUserService } from '../services/update-user.service.js';
import type { UpdateUserStatusService } from '../services/update-user-status.service.js';
import { createUserSchema } from '../schemas/create-user.schema.js';
import { updateUserSchema } from '../schemas/update-user.schema.js';
import { updateUserStatusSchema } from '../schemas/update-user-status.schema.js';
import { isProduction } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface UsersDeps {
  createUserService: CreateUserService;
  listUsersService: ListUsersService;
  updateUserService: UpdateUserService;
  updateUserStatusService: UpdateUserStatusService;
  requireAuth: RequestHandler;
}

export function createUsersRouter({
  createUserService,
  listUsersService,
  updateUserService,
  updateUserStatusService,
  requireAuth,
}: UsersDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('VIAGEM.CRIAR'),
    asyncHandler(async (req, res) => {
      const users =
        req.query.includeInactive === 'true'
          ? await listUsersService.execute(req.auth!.user.companyId, true)
          : await listUsersService.execute(req.auth!.user.companyId);
      res.json(success({ users }));
    }),
  );

  router.put(
    '/:id',
    requireAuth,
    requirePermission('USUARIO.EDITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const userId = req.params.id;
      if (!userId)
        throw new AppError(400, 'USER_ID_REQUIRED', 'Identificador do funcionário é obrigatório.');
      const dto = updateUserSchema.parse(req.body);
      const user = await updateUserService.execute(
        userId,
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ user }));
    }),
  );

  router.patch(
    '/:id/status',
    requireAuth,
    requirePermission('USUARIO.EDITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const userId = req.params.id;
      if (!userId)
        throw new AppError(400, 'USER_ID_REQUIRED', 'Identificador do funcionário é obrigatório.');
      const dto = updateUserStatusSchema.parse(req.body);
      const user = await updateUserStatusService.execute(
        userId,
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ user }));
    }),
  );

  router.post(
    '/',
    requireAuth,
    requirePermission('USUARIO.CRIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = createUserSchema.parse(req.body);
      const result = await createUserService.execute(
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      if (isProduction) {
        res.status(201).json(success({ user: result.user }));
        return;
      }
      res.status(201).json(success(result));
    }),
  );

  return router;
}
