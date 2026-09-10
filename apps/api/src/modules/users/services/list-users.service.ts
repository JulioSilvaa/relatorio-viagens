import type { UserDirectoryEntry, UsersRepository } from '../repositories/users.repository.js';

export class ListUsersService {
  constructor(private readonly users: UsersRepository) {}

  async execute(includeInactive = false): Promise<UserDirectoryEntry[]> {
    return includeInactive ? this.users.findAll() : this.users.findAllActive();
  }
}
