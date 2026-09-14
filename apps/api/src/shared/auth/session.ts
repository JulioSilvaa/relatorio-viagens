import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { hashToken } from '../utils/crypto.js';
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from './cookies.js';

export interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  status: string;
  roleCode: string;
  companyId: string | null;
  permissions: string[];
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  lastActivityAt: Date;
  expiresAt: Date;
  user: AuthSessionUser;
}

export interface SessionStore {
  findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  markActivity(sessionId: string, now: Date, expiresAt: Date): Promise<void>;
  revoke(sessionId: string, revokedAt: Date): Promise<void>;
}

export interface AuthContext {
  sessionId: string;
  userId: string;
  user: AuthSessionUser;
}

export function createRequireAuth(store: SessionStore): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      const token = req.cookies?.[SESSION_COOKIE];
      if (!token) {
        next(new AppError(401, 'UNAUTHENTICATED', 'Não autenticado.'));
        return;
      }

      const session = await store.findByTokenHash(hashToken(token));
      if (!session) {
        clearSessionCookie(res);
        next(new AppError(401, 'UNAUTHENTICATED', 'Sessão não encontrada.'));
        return;
      }

      if (session.expiresAt.getTime() < Date.now()) {
        await store.revoke(session.id, new Date());
        clearSessionCookie(res);
        next(new AppError(401, 'SESSION_EXPIRED', 'Sessão expirada.'));
        return;
      }

      const idleMs = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;
      const idleElapsedMs = Date.now() - session.lastActivityAt.getTime();
      if (idleElapsedMs > idleMs) {
        await store.revoke(session.id, new Date());
        clearSessionCookie(res);
        next(new AppError(401, 'SESSION_EXPIRED', 'Sessão expirada por inatividade.'));
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + idleMs);
      await store.markActivity(session.id, now, expiresAt);
      setSessionCookie(res, token, env.SESSION_IDLE_TIMEOUT_MINUTES);

      req.auth = {
        sessionId: session.id,
        userId: session.userId,
        user: session.user,
      };
      next();
    })().catch(next);
  };
}
