import { env } from '../../../config/env.js';
import type { EmailProvider } from '../../../shared/email/email-provider.js';
import { generateSecureToken, hashToken } from '../../../shared/utils/crypto.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import type { ForgotPasswordDto } from '../auth.schemas.js';

export interface PasswordResetsStore {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
}

export class ForgotPasswordService {
  constructor(
    private readonly users: UsersRepository,
    private readonly resets: PasswordResetsStore,
    private readonly email: EmailProvider,
  ) {}

  async execute(input: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.passwordHash || user.status !== 'ATIVO') {
      return;
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_HOURS * 3600_000);
    await this.resets.create(user.id, hashToken(token), expiresAt);
    await this.email.sendPasswordReset({
      to: user.email,
      name: user.name,
      token,
      expiresAt,
    });
  }
}
