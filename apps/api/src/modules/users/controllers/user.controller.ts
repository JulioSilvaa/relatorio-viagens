import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { CreateUserService } from '../services/create-user.service.js';
import type { ListUsersService } from '../services/list-users.service.js';
import { createUserSchema } from '../schemas/create-user.schema.js';
import { isProduction } from '../../../config/env.js';

export interface UsersDeps {
  createUserService: CreateUserService;
  listUsersService: ListUsersService;
  requireAuth: RequestHandler;
}

export function createUsersRouter({
  createUserService,
  listUsersService,
  requireAuth,
}: UsersDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requirePermission('VIAGEM.CRIAR'),
    asyncHandler(async (_req, res) => {
      const users = await listUsersService.execute();
      res.json(success({ users }));
    }),
  );

  router.post(
    '/',
    requireAuth,
    requirePermission('USUARIO.CRIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = createUserSchema.parse(req.body);
      const result = await createUserService.execute(dto, req.auth!.userId);
      if (isProduction) {
        res.status(201).json(success({ user: result.user }));
        return;
      }
      res.status(201).json(success(result));
    }),
  );

  return router;
}
