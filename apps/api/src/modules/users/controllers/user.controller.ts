import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { CreateUserService } from '../services/create-user.service.js';
import { createUserSchema } from '../schemas/create-user.schema.js';
import { isProduction } from '../../../config/env.js';

export interface UsersDeps {
  createUserService: CreateUserService;
  requireAuth: RequestHandler;
}

export function createUsersRouter({ createUserService, requireAuth }: UsersDeps): Router {
  const router = Router();

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
