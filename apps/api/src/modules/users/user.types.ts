import type { User } from '@prisma/client';

export const DEPARTMENT_TYPES = ['COMERCIAL', 'TECNICO'] as const;
export type DepartmentTypeValue = (typeof DEPARTMENT_TYPES)[number];

export const ROLE_TYPES = ['EMPLOYEE', 'MANAGER_ADMIN', 'FINANCE', 'FISCAL'] as const;
export type RoleTypeValue = (typeof ROLE_TYPES)[number];

export const USER_STATUS = ['ATIVO', 'INATIVO'] as const;
export type UserStatusValue = (typeof USER_STATUS)[number];

export type PersistedUser = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'department'
  | 'cargo'
  | 'status'
  | 'passwordHash'
  | 'roleId'
  | 'managerId'
> & {
  roleCode: RoleTypeValue;
};

export interface UserView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: User['department'];
  cargo: string;
  roleCode: RoleTypeValue;
  status: User['status'];
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string | null;
  department: DepartmentTypeValue;
  cargo: string;
  roleCode: RoleTypeValue;
  managerId?: string | null;
}

export interface RoleRecord {
  id: string;
  code: string;
  name: string;
}
