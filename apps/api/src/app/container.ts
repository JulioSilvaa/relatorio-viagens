import { Router } from 'express';
import { prisma } from '../config/database.js';
import { createEmailProvider } from '../shared/email/email-provider.factory.js';
import { createRequireAuth } from '../shared/auth/session.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { PrismaUsersRepository } from '../modules/users/repositories/users.repository.prisma.js';
import { CreateUserService } from '../modules/users/services/create-user.service.js';
import { createUsersRouter } from '../modules/users/controllers/user.controller.js';
import {
  PrismaInvitesRepository,
  PrismaPasswordResetRepository,
  PrismaSessionsRepository,
} from '../modules/auth/repositories/auth.repository.prisma.js';
import { LoginService } from '../modules/auth/services/login.service.js';
import { MeService } from '../modules/auth/services/me.service.js';
import { LogoutService } from '../modules/auth/services/logout.service.js';
import { AcceptInviteService } from '../modules/auth/services/accept-invite.service.js';
import { ForgotPasswordService } from '../modules/auth/services/forgot-password.service.js';
import { ResetPasswordService } from '../modules/auth/services/reset-password.service.js';
import { createAuthRouter } from '../modules/auth/controllers/auth.controller.js';

export interface Container {
  usersRouter: ReturnType<typeof createUsersRouter>;
  authRouter: ReturnType<typeof createAuthRouter>;
}

export function buildContainer(): Container {
  const users = new PrismaUsersRepository();
  const sessions = new PrismaSessionsRepository();
  const invites = new PrismaInvitesRepository();
  const resets = new PrismaPasswordResetRepository();
  const email = createEmailProvider();
  const audit = new AuditService();

  const createUserService = new CreateUserService(users, invites, audit, email);
  const loginService = new LoginService(users, sessions);
  const meService = new MeService(users);
  const logoutService = new LogoutService(sessions);
  const acceptInviteService = new AcceptInviteService(users, invites, sessions);
  const forgotPasswordService = new ForgotPasswordService(users, resets, email);
  const resetPasswordService = new ResetPasswordService(users, resets, sessions);

  const requireAuth = createRequireAuth(sessions);

  const usersRouter = createUsersRouter({ createUserService, requireAuth });
  const authRouter = createAuthRouter({
    loginService,
    meService,
    logoutService,
    acceptInviteService,
    forgotPasswordService,
    resetPasswordService,
    requireAuth,
  });

  return { usersRouter, authRouter };
}

export function createHealthRouter() {
  const router = Router();
  router.get('/health', (_req, res) => {
    void prisma.$queryRaw`SELECT 1`
      .then(() => res.json({ data: { status: 'ok' } }))
      .catch(() =>
        res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Base indisponível.' } }),
      );
  });
  return router;
}
