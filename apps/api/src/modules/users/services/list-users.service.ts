import type { UserDirectoryEntry, UsersRepository } from '../repositories/users.repository.js';

export class ListUsersService {
  constructor(private readonly users: UsersRepository) {}

  async execute(companyId: string | null, includeInactive = false): Promise<UserDirectoryEntry[]> {
    return includeInactive ? this.users.findAll(companyId) : this.users.findAllActive(companyId);
  }
}
