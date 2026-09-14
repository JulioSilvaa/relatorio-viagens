import { Prisma } from '@prisma/client';
import { env } from '../../../config/env.js';
import { generateSecureToken, hashToken } from '../../../shared/utils/crypto.js';
import { hashPassword } from '../../../shared/utils/password.js';
import type { CompaniesRepository } from '../../companies/repositories/companies.repository.js';
import { CnpjAlreadyUsedError } from '../../companies/errors/company.errors.js';
import { RoleNotFoundError, UserAlreadyExistsError } from '../../users/errors/user.errors.js';
import { userToView } from '../../users/presenters/user.presenter.js';
import type { UsersRepository } from '../../users/repositories/users.repository.js';
import type { UserView } from '../../users/user.types.js';
import type { RegisterDto } from '../auth.schemas.js';
import type { SessionsRepository } from '../auth.types.js';

export interface RegisterResult {
  token: string;
  user: UserView;
}

export interface RegisterContext {
  ipAddress?: string;
  userAgent?: string;
}

export class RegisterService {
  constructor(
    private readonly users: UsersRepository,
    private readonly companies: CompaniesRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async execute(input: RegisterDto, context: RegisterContext = {}): Promise<RegisterResult> {
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const existingCompany = await this.companies.findByCnpj(input.cnpj);
    if (existingCompany) {
      throw new CnpjAlreadyUsedError();
    }

    const role = await this.users.findRoleByCode('MANAGER_ADMIN');
    if (!role) {
      throw new RoleNotFoundError();
    }

    const passwordHash = await hashPassword(input.password);

    const company = await this.companies.create({
      name: input.companyName,
      cnpj: input.cnpj,
    });

    let user;
    try {
      user = await this.users.create({
        name: input.name,
        email: input.email,
        department: input.department,
        cargo: input.cargo,
        roleCode: 'MANAGER_ADMIN',
        roleId: role.id,
        companyId: company.id,
        status: 'ATIVO',
        passwordHash,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UserAlreadyExistsError();
      }
      throw error;
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

    return { token, user: userToView(user, 'MANAGER_ADMIN') };
  }
}
