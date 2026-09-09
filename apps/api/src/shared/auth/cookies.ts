import type { Response } from 'express';
import { env } from '../../config/env.js';

export const SESSION_COOKIE = 'vdr_session';
export const CSRF_COOKIE = 'vdr_csrf';

function baseOptions() {
  return { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax' as const, path: '/' };
}

export function setSessionCookie(res: Response, token: string, maxAgeMinutes: number): void {
  res.cookie(SESSION_COOKIE, token, {
    ...baseOptions(),
    maxAge: maxAgeMinutes * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions());
}
