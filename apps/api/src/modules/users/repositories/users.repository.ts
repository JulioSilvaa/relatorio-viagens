import type {
  CreateUserInput,
  PersistedUser,
  RoleRecord,
  UpdateUserInput,
  UserStatusValue,
} from '../user.types.js';

export interface UserIdRef {
  id: string;
  name: string;
}

export interface UserDirectoryEntry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  cargo: string;
  status: string;
  roleCode: string;
  companyId: string | null;
}

export interface UsersRepository {
  create(input: CreateUserInput & { roleId: string; status: 'ATIVO' }): Promise<PersistedUser>;
  findByEmail(email: string): Promise<PersistedUser | null>;
  findById(id: string): Promise<PersistedUser | null>;
  findRoleByCode(code: string): Promise<RoleRecord | null>;
  update(id: string, input: UpdateUserInput & { roleId: string }): Promise<PersistedUser>;
  updateStatus(id: string, status: UserStatusValue): Promise<PersistedUser>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  findAllByRoleCode(code: string, companyId: string): Promise<UserIdRef[]>;
  findAllActive(companyId: string | null): Promise<UserDirectoryEntry[]>;
  findAll(companyId: string | null): Promise<UserDirectoryEntry[]>;
}
