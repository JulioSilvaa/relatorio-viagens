import { hashToken } from '../../../shared/utils/crypto.js';
import { hashPassword } from '../../../shared/utils/password.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import type { ResetPasswordDto } from '../auth.schemas.js';
import type { SessionsRepository } from '../auth.types.js';
import {
  ResetTokenExpiredError,
  ResetTokenInvalidError,
  ResetTokenUsedError,
} from '../errors/auth.errors.js';
import type { PasswordResetsStore } from './forgot-password.service.js';
import type { PasswordResetRecord } from '../auth.types.js';

export interface PasswordResetsStoreWithLookup extends PasswordResetsStore {
  findByTokenHash(tokenHash: string): Promise<PasswordResetRecord | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}

export class ResetPasswordService {
  constructor(
    private readonly users: UsersRepository,
    private readonly resets: PasswordResetsStoreWithLookup,
    private readonly sessions: SessionsRepository,
  ) {}

  async execute(input: ResetPasswordDto): Promise<void> {
    const record = await this.resets.findByTokenHash(hashToken(input.token));
    if (!record) {
      throw new ResetTokenInvalidError();
    }
    if (record.usedAt) {
      throw new ResetTokenUsedError();
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new ResetTokenExpiredError();
    }

    const passwordHash = await hashPassword(input.password);
    await this.users.updatePassword(record.userId, passwordHash);
    await this.resets.markUsed(record.id, new Date());
    await this.sessions.revokeAllForUser(record.userId, new Date());
  }
}
