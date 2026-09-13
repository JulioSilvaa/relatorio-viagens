import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { clearSessionCookie, setSessionCookie } from '../../../shared/auth/cookies.js';
import { env } from '../../../config/env.js';
import type { LoginService } from '../services/login.service.js';
import type { MeService } from '../services/me.service.js';
import type { LogoutService } from '../services/logout.service.js';
import type { AcceptInviteService } from '../services/accept-invite.service.js';
import type { ForgotPasswordService } from '../services/forgot-password.service.js';
import type { ResetPasswordService } from '../services/reset-password.service.js';
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../auth.schemas.js';

export interface AuthDeps {
  loginService: LoginService;
  meService: MeService;
  logoutService: LogoutService;
  acceptInviteService: AcceptInviteService;
  forgotPasswordService: ForgotPasswordService;
  resetPasswordService: ResetPasswordService;
  requireAuth: RequestHandler;
}

export function createAuthRouter({
  loginService,
  meService,
  logoutService,
  acceptInviteService,
  forgotPasswordService,
  resetPasswordService,
  requireAuth,
}: AuthDeps): Router {
  const router = Router();

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const dto = loginSchema.parse(req.body);
      const result = await loginService.execute(dto, {
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
      });
      setSessionCookie(res, result.token, env.SESSION_IDLE_TIMEOUT_MINUTES);
      res.json(success({ user: result.user }));
    }),
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await meService.execute(req.auth!.userId);
      res.json(success({ user: { ...user, permissions: req.auth!.user.permissions } }));
    }),
  );

  router.post(
    '/logout',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      await logoutService.execute(req.auth!.sessionId);
      clearSessionCookie(res);
      res.status(204).send();
    }),
  );

  router.post(
    '/accept-invite',
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = acceptInviteSchema.parse(req.body);
      await acceptInviteService.execute(dto);
      res.status(204).send();
    }),
  );

  router.post(
    '/forgot-password',
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = forgotPasswordSchema.parse(req.body);
      await forgotPasswordService.execute(dto);
      res.status(202).json(success({ message: 'Se o e-mail existir, enviaremos as instruções.' }));
    }),
  );

  router.post(
    '/reset-password',
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = resetPasswordSchema.parse(req.body);
      await resetPasswordService.execute(dto);
      res.status(204).send();
    }),
  );

  return router;
}
