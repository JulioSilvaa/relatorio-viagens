import type { SessionsRepository } from '../auth.types.js';

export class LogoutService {
  constructor(private readonly sessions: SessionsRepository) {}

  async execute(sessionId: string, revokedAt: Date = new Date()): Promise<void> {
    await this.sessions.revoke(sessionId, revokedAt);
  }
}
