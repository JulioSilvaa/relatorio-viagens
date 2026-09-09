import { env } from '../../../config/env.js';
import { hashToken, generateSecureToken } from '../../../shared/utils/crypto.js';
import { verifyPassword } from '../../../shared/utils/password.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { userToView } from '../../users/presenters/user.presenter.js';
import type { UserView } from '../../users/user.types.js';
import type { SessionsRepository } from '../auth.types.js';
import { InvalidCredentialsError, UserInactiveError } from '../errors/auth.errors.js';
import type { LoginDto } from '../auth.schemas.js';

export interface LoginResult {
  token: string;
  user: UserView;
}

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

export class LoginService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async execute(input: LoginDto, context: LoginContext = {}): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (user.status !== 'ATIVO') {
      throw new UserInactiveError();
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + env.SESSION_IDLE_TIMEOUT_MINUTES * 60_000);

    await this.sessions.create({
      userId: user.id,
      tokenHash: hashToken(token),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt,
    });

    return { token, user: userToView(user, user.roleCode) };
  }
}
