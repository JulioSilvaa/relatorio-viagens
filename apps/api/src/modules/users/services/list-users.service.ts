import type { UserDirectoryEntry, UsersRepository } from '../repositories/users.repository.js';

export class ListUsersService {
  constructor(private readonly users: UsersRepository) {}

  async execute(): Promise<UserDirectoryEntry[]> {
    return this.users.findAllActive();
  }
}
