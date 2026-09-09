import type { Express } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { DepartmentType, RoleType } from '@prisma/client';
import { prisma } from '../src/config/database.js';
import { createApp } from '../src/app/app.js';
import { buildContainer, createHealthRouter } from '../src/app/container.js';

export type TestAgent = ReturnType<typeof request.agent>;

export function buildApp(): Express {
  const container = buildContainer();
  return createApp({
    healthRouter: createHealthRouter(),
    authRouter: container.authRouter,
    usersRouter: container.usersRouter,
  });
}

const ROLE_PERMISSIONS: Record<RoleType, readonly string[]> = {
  EMPLOYEE: [
    'VIAGEM.CRIAR',
    'VIAGEM.EDITAR',
    'VIAGEM.ENTREGAR',
    'DESPESA.CRIAR',
    'DESPESA.EDITAR',
    'RELATORIO.VISUALIZAR',
  ],
  MANAGER_ADMIN: [
    'USUARIO.CRIAR',
    'USUARIO.EDITAR',
    'VIAGEM.CRIAR',
    'VIAGEM.EDITAR',
    'VIAGEM.ENTREGAR',
    'DESPESA.CRIAR',
    'DESPESA.EDITAR',
    'RELATORIO.VISUALIZAR',
    'RELATORIO.APROVAR',
    'RELATORIO.RETORNAR',
    'CONFIG.CATEGORIA.GERENCIAR',
    'CONFIG.LIMITE.GERENCIAR',
  ],
  FINANCE: ['FINANCEIRO.REEMBOLSO.PROCESSAR'],
  FISCAL: ['FISCAL.DOCUMENTO.VALIDAR'],
};

export async function seedBaseData(): Promise<void> {
  for (const roleCode of Object.keys(ROLE_PERMISSIONS) as RoleType[]) {
    await prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: { code: roleCode, name: roleCode, description: null },
    });
  }

  for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode as RoleType } });
    for (const permissionCode of permissions) {
      const permission = await prisma.permission.upsert({
        where: { code: permissionCode },
        update: {},
        create: { code: permissionCode, name: permissionCode, description: null },
      });
      await prisma.permissionRole.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

export async function truncateAll(): Promise<void> {
  await prisma.auditEvent.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.permissionRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

export interface CreateUserOptions {
  email: string;
  password?: string;
  role?: RoleType;
  department?: DepartmentType;
  name?: string;
  cargo?: string;
  status?: 'ATIVO' | 'INATIVO';
}

export async function createUser(options: CreateUserOptions) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: options.role ?? 'EMPLOYEE' } });
  const passwordHash = options.password ? await bcrypt.hash(options.password, 10) : null;
  return prisma.user.create({
    data: {
      name: options.name ?? 'Usuário de Teste',
      email: options.email,
      department: options.department ?? 'COMERCIAL',
      cargo: options.cargo ?? 'Analista',
      roleId: role.id,
      status: options.status ?? 'ATIVO',
      passwordHash,
    },
  });
}

export async function getCsrfValue(agent: TestAgent): Promise<string> {
  const res = await agent.get('/api/health');
  const setCookie = (res.headers['set-cookie'] ?? []) as string[];
  const entry = setCookie.find((cookie) => cookie.startsWith('vdr_csrf='));
  if (!entry) {
    throw new Error('Cookie vdr_csrf não retornado.');
  }
  const value = entry.split(';')[0]!.split('=')[1]!;
  const csrf = value.split('.')[0]!;
  if (!csrf) {
    throw new Error('Cookie vdr_csrf inválido.');
  }
  return csrf;
}

export interface LoginResult {
  agent: TestAgent;
  csrf: string;
}

export async function loginAs(app: Express, email: string, password: string): Promise<LoginResult> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login falhou com status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  const setCookie = (res.headers['set-cookie'] ?? []) as string[];
  const csrfEntry = setCookie.find((cookie) => cookie.startsWith('vdr_csrf='));
  const csrf = csrfEntry
    ? csrfEntry.split(';')[0]!.split('=')[1]!.split('.')[0]!
    : await getCsrfValue(agent);
  return { agent, csrf };
}
