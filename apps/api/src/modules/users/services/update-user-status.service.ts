import type { AuditService } from '../../../modules/audit/audit.service.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import { userToView } from '../presenters/user.presenter.js';
import type { UpdateUserStatusDto } from '../schemas/update-user-status.schema.js';

export class UpdateUserStatusService {
  constructor(
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, input: UpdateUserStatusDto, actorId: string) {
    const current = await this.users.findById(id);
    if (!current) throw new Error('Funcionário não encontrado.');

    const user = await this.users.updateStatus(id, input.status);
    await this.audit.record({
      userId: actorId,
      operation: input.status === 'ATIVO' ? 'REATIVAR' : 'DESATIVAR',
      entityType: 'USUARIO',
      entityId: id,
      field: 'status',
      oldValue: current.status,
      newValue: user.status,
    });

    return userToView(user, user.roleCode);
  }
}
