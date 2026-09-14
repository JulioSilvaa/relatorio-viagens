import { Prisma } from '@prisma/client';
import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import { userToView } from '../presenters/user.presenter.js';
import {
  ManagerNotFoundError,
  RoleNotFoundError,
  TenantRequiredError,
  UserAlreadyExistsError,
  UserNotFoundInCompanyError,
} from '../errors/user.errors.js';
import type { UpdateUserDto } from '../schemas/update-user.schema.js';

export class UpdateUserService {
  constructor(
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, input: UpdateUserDto, actorId: string, actorCompanyId: string | null) {
    if (!actorCompanyId) throw new TenantRequiredError();

    const current = await this.users.findById(id);
    if (!current || current.companyId !== actorCompanyId) {
      throw new UserNotFoundInCompanyError();
    }

    const existing = await this.users.findByEmail(input.email);
    if (existing && existing.id !== id) throw new UserAlreadyExistsError();

    const role = await this.users.findRoleByCode(input.roleCode);
    if (!role) throw new RoleNotFoundError();
    if (input.managerId) {
      const manager = await this.users.findById(input.managerId);
      if (!manager || manager.companyId !== actorCompanyId) throw new ManagerNotFoundError();
    }

    let user;
    try {
      user = await this.users.update(id, { ...input, roleId: role.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UserAlreadyExistsError();
      }
      throw error;
    }

    await this.audit.record({
      userId: actorId,
      operation: 'EDITAR',
      entityType: 'USUARIO',
      entityId: id,
      oldValue: current.email,
      newValue: user.email,
    });

    return userToView(user, user.roleCode);
  }
}
