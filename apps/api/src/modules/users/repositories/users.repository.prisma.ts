import { prisma } from '../../../config/database.js';
import type { RoleType } from '@prisma/client';
import type {
  CreateUserInput,
  PersistedUser,
  RoleRecord,
  UpdateUserInput,
  UserStatusValue,
} from '../user.types.js';
import type { UserIdRef, UserDirectoryEntry, UsersRepository } from './users.repository.js';

interface UserWithRoleCode {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  cargo: string;
  status: string;
  passwordHash: string | null;
  roleId: string;
  managerId: string | null;
  companyId: string | null;
  roleCode: string;
}

function toPersistedUser(user: UserWithRoleCode): PersistedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department as PersistedUser['department'],
    cargo: user.cargo,
    status: user.status as PersistedUser['status'],
    passwordHash: user.passwordHash,
    roleId: user.roleId,
    managerId: user.managerId,
    companyId: user.companyId,
    roleCode: user.roleCode as PersistedUser['roleCode'],
  };
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  department: true,
  cargo: true,
  status: true,
  passwordHash: true,
  roleId: true,
  managerId: true,
  companyId: true,
  role: { select: { code: true } },
} as const;

export class PrismaUsersRepository implements UsersRepository {
  async create(
    input: CreateUserInput & { roleId: string; status: 'ATIVO' },
  ): Promise<PersistedUser> {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        department: input.department,
        cargo: input.cargo,
        roleId: input.roleId,
        status: input.status,
        managerId: input.managerId ?? null,
        companyId: input.companyId ?? null,
        passwordHash: input.passwordHash ?? null,
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      cargo: user.cargo,
      status: user.status,
      passwordHash: user.passwordHash,
      roleId: user.roleId,
      managerId: user.managerId,
      companyId: user.companyId,
      roleCode: input.roleCode,
    };
  }

  async findByEmail(email: string): Promise<PersistedUser | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });
    return user ? toPersistedUser({ ...user, roleCode: user.role.code }) : null;
  }

  async findById(id: string): Promise<PersistedUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    return user ? toPersistedUser({ ...user, roleCode: user.role.code }) : null;
  }

  async findRoleByCode(code: string): Promise<RoleRecord | null> {
    const role = await prisma.role.findUnique({ where: { code: code as RoleType } });
    return role ? { id: role.id, code: role.code, name: role.name } : null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async update(id: string, input: UpdateUserInput & { roleId: string }): Promise<PersistedUser> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        department: input.department,
        cargo: input.cargo,
        roleId: input.roleId,
        managerId: input.managerId ?? null,
      },
      select: USER_SELECT,
    });
    return toPersistedUser({ ...user, roleCode: user.role.code });
  }

  async updateStatus(id: string, status: UserStatusValue): Promise<PersistedUser> {
    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: USER_SELECT,
    });
    return toPersistedUser({ ...user, roleCode: user.role.code });
  }

  async findAllByRoleCode(code: string, companyId: string): Promise<UserIdRef[]> {
    const users = await prisma.user.findMany({
      where: { role: { code: code as RoleType }, companyId, status: 'ATIVO' },
      select: { id: true, name: true },
    });
    return users;
  }

  async findAllActive(companyId: string | null): Promise<UserDirectoryEntry[]> {
    return this.findDirectory({ status: 'ATIVO', companyId });
  }

  async findAll(companyId: string | null): Promise<UserDirectoryEntry[]> {
    return this.findDirectory({ companyId });
  }

  private async findDirectory(where: {
    status?: 'ATIVO';
    companyId: string | null;
  }): Promise<UserDirectoryEntry[]> {
    if (!where.companyId) return [];

    const users = await prisma.user.findMany({
      where: { ...(where.status ? { status: where.status } : {}), companyId: where.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        cargo: true,
        status: true,
        companyId: true,
        role: { select: { code: true } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map(({ role, ...user }) => ({
      ...user,
      roleCode: role.code,
    }));
  }
}
