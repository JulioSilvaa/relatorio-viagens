import type { UsersRepository } from '../../users/repositories/users.repository.js';
import { userToView } from '../../users/presenters/user.presenter.js';
import { UserNotFoundError } from '../errors/auth.errors.js';

export class MeService {
  constructor(private readonly users: UsersRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return userToView(user, user.roleCode);
  }
}
