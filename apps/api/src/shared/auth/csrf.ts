import { createHmac, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { safeEqual } from '../utils/crypto.js';
import { CSRF_COOKIE } from './cookies.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const CSRF_HEADER = 'x-csrf-token';

function signValue(value: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(value).digest('hex');
}

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  const existing = req.cookies?.[CSRF_COOKIE];
  if (!existing || !existing.includes('.')) {
    const value = randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, `${value}.${signValue(value)}`, {
      httpOnly: false,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
    });
  }
  next();
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!cookie) {
    next(new AppError(403, 'CSRF_TOKEN_MISSING', 'Token de segurança ausente.'));
    return;
  }

  const [value, signature] = cookie.split('.');
  const expectedSignature = signValue(value ?? '');
  if (!value || !signature || !safeEqual(signature, expectedSignature)) {
    next(new AppError(403, 'CSRF_TOKEN_INVALID', 'Token de segurança inválido.'));
    return;
  }

  const header = req.header(CSRF_HEADER);
  if (!header || !safeEqual(header, value)) {
    next(new AppError(403, 'CSRF_TOKEN_MISMATCH', 'Token de segurança incompatível.'));
    return;
  }

  next();
}
