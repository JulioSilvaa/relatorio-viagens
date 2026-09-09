import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export function requirePermission(code: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Não autenticado.'));
      return;
    }
    if (!req.auth.user.permissions.includes(code)) {
      next(new AppError(403, 'PERMISSION_DENIED', 'Sem permissão para esta operação.'));
      return;
    }
    next();
  };
}
