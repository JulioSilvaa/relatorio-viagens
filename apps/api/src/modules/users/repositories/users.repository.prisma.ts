import { prisma } from '../../../config/database.js';
import type { RoleType } from '@prisma/client';
import type { CreateUserInput, PersistedUser, RoleRecord } from '../user.types.js';
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

  async findAllByRoleCode(code: string): Promise<UserIdRef[]> {
    const users = await prisma.user.findMany({
      where: { role: { code: code as RoleType } },
      select: { id: true, name: true },
    });
    return users;
  }

  async findAllActive(): Promise<UserDirectoryEntry[]> {
    const users = await prisma.user.findMany({
      where: { status: 'ATIVO' },
      select: {
        id: true,
        name: true,
        email: true,
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
