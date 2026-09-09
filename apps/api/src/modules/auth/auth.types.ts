import type { SessionStore } from '../../shared/auth/session.js';

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface SessionsRepository extends SessionStore {
  create(input: CreateSessionInput): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}

export interface InviteRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}
