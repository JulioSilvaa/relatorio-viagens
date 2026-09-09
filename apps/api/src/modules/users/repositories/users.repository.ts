import type { CreateUserInput, PersistedUser, RoleRecord } from '../user.types.js';

export interface UsersRepository {
  create(input: CreateUserInput & { roleId: string; status: 'ATIVO' }): Promise<PersistedUser>;
  findByEmail(email: string): Promise<PersistedUser | null>;
  findById(id: string): Promise<PersistedUser | null>;
  findRoleByCode(code: string): Promise<RoleRecord | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}
