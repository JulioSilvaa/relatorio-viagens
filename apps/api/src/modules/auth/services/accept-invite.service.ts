import { hashPassword } from '../../../shared/utils/password.js';
import { hashToken } from '../../../shared/utils/crypto.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import type { AcceptInviteDto } from '../auth.schemas.js';
import type { InviteRecord, SessionsRepository } from '../auth.types.js';
import {
  InviteExpiredError,
  InviteInvalidError,
  InviteUsedError,
  PasswordAlreadyDefinedError,
} from '../errors/auth.errors.js';

export interface InvitesStore {
  findByTokenHash(tokenHash: string): Promise<InviteRecord | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}

export class AcceptInviteService {
  constructor(
    private readonly users: UsersRepository,
    private readonly invites: InvitesStore,
    private readonly sessions: SessionsRepository,
  ) {}

  async execute(input: AcceptInviteDto): Promise<void> {
    const invite = await this.invites.findByTokenHash(hashToken(input.token));
    if (!invite) {
      throw new InviteInvalidError();
    }
    if (invite.usedAt) {
      throw new InviteUsedError();
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new InviteExpiredError();
    }

    const user = await this.users.findById(invite.userId);
    if (!user) {
      throw new InviteInvalidError();
    }
    if (user.passwordHash) {
      throw new PasswordAlreadyDefinedError();
    }

    const passwordHash = await hashPassword(input.password);
    await this.users.updatePassword(invite.userId, passwordHash);
    await this.invites.markUsed(invite.id, new Date());
    await this.sessions.revokeAllForUser(invite.userId, new Date());
  }
}
