import { Prisma } from '@prisma/client';
import { env } from '../../../config/env.js';
import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { EmailProvider } from '../../../shared/email/email-provider.js';
import { generateSecureToken, hashToken } from '../../../shared/utils/crypto.js';
import type { UserView } from '../user.types.js';
import { userToView } from '../presenters/user.presenter.js';
import type { InviteWriter } from '../repositories/invite-writer.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import {
  ManagerNotFoundError,
  RoleNotFoundError,
  UserAlreadyExistsError,
} from '../errors/user.errors.js';
import type { CreateUserDto } from '../schemas/create-user.schema.js';

export interface CreateUserResult {
  user: UserView;
  inviteToken: string;
}

export class CreateUserService {
  constructor(
    private readonly users: UsersRepository,
    private readonly invites: InviteWriter,
    private readonly audit: AuditService,
    private readonly email: EmailProvider,
  ) {}

  async execute(input: CreateUserDto, actorId: string): Promise<CreateUserResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError();
    }

    const role = await this.users.findRoleByCode(input.roleCode);
    if (!role) {
      throw new RoleNotFoundError();
    }

    if (input.managerId) {
      const manager = await this.users.findById(input.managerId);
      if (!manager) {
        throw new ManagerNotFoundError();
      }
    }

    let user;
    try {
      user = await this.users.create({ ...input, roleId: role.id, status: 'ATIVO' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UserAlreadyExistsError();
      }
      throw error;
    }

    const inviteToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 3600_000);
    await this.invites.createInvite(user.id, hashToken(inviteToken), expiresAt);

    await this.audit.record({
      userId: actorId,
      operation: 'CRIAR',
      entityType: 'USUARIO',
      entityId: user.id,
      newValue: user.email,
    });

    await this.email.sendInvite({
      to: user.email,
      name: user.name,
      token: inviteToken,
      expiresAt,
    });

    return { user: userToView(user, input.roleCode), inviteToken };
  }
}
