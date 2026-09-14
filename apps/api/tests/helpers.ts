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
    tripsRouter: container.tripsRouter,
    expensesRouter: container.expensesRouter,
    expenseCategoriesRouter: container.expenseCategoriesRouter,
    expenseLimitsRouter: container.expenseLimitsRouter,
    receiptsRouter: container.receiptsRouter,
    approvalsRouter: container.approvalsRouter,
    costCentersRouter: container.costCentersRouter,
    creditCardsRouter: container.creditCardsRouter,
    notificationsRouter: container.notificationsRouter,
    settingsRouter: container.settingsRouter,
    ocrRouter: container.ocrRouter,
    fiscalRouter: container.fiscalRouter,
    auditRouter: container.auditRouter,
    financeRouter: container.financeRouter,
    dashboardRouter: container.dashboardRouter,
    reportsRouter: container.reportsRouter,
    exportsRouter: container.exportsRouter,
  });
}

const ROLE_PERMISSIONS: Record<RoleType, readonly string[]> = {
  EMPLOYEE: [
    'VIAGEM.CRIAR',
    'VIAGEM.EDITAR',
    'VIAGEM.ENTREGAR',
    'VIAGEM.EXCLUIR',
    'DESPESA.CRIAR',
    'DESPESA.EDITAR',
    'DESPESA.EXCLUIR',
    'RELATORIO.VISUALIZAR',
    'CONFIG.CENTRO_CUSTO.VISUALIZAR',
    'ADIANTAMENTO.SOLICITAR',
    'CARTAO.VISUALIZAR',
    'VIAGEM.CARTAO.SELECIONAR',
  ],
  MANAGER_ADMIN: [
    'USUARIO.CRIAR',
    'USUARIO.EDITAR',
    'CARTAO.CRIAR',
    'CARTAO.VISUALIZAR',
    'CARTAO.EDITAR',
    'CARTAO.DESATIVAR',
    'VIAGEM.CARTAO.SELECIONAR',
    'VIAGEM.CRIAR',
    'VIAGEM.EDITAR',
    'VIAGEM.ENTREGAR',
    'VIAGEM.EXCLUIR',
    'DESPESA.CRIAR',
    'DESPESA.EDITAR',
    'DESPESA.EXCLUIR',
    'RELATORIO.VISUALIZAR',
    'RELATORIO.PDF.GERAR',
    'RELATORIO.APROVAR',
    'RELATORIO.RETORNAR',
    'CONFIG.CATEGORIA.GERENCIAR',
    'CONFIG.LIMITE.GERENCIAR',
    'CONFIG.CENTRO_CUSTO.GERENCIAR',
    'CONFIG.CENTRO_CUSTO.VISUALIZAR',
    'CONFIG.SISTEMA.GERENCIAR',
    'CONFIG.SISTEMA.GERENCIAR',
    'DASHBOARD.GERENCIAL',
    'AUDITORIA.CONSULTAR',
    'ADIANTAMENTO.SOLICITAR',
    'ADIANTAMENTO.ANALISAR',
    'ADIANTAMENTO.PAGAR',
  ],
  FINANCE: [
    'FINANCEIRO.REEMBOLSO.PROCESSAR',
    'RELATORIO.VISUALIZAR',
    'RELATORIO.PDF.GERAR',
    'CONFIG.CENTRO_CUSTO.VISUALIZAR',
    'ADIANTAMENTO.PAGAR',
  ],
  FISCAL: ['FISCAL.DOCUMENTO.VALIDAR', 'RELATORIO.PDF.GERAR'],
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

let DEFAULT_COMPANY_ID: string | null = null;

export const TEST_COMPANY_CNPJ = '99999999000191';

export async function defaultCompany(): Promise<{ id: string; name: string; cnpj: string }> {
  if (DEFAULT_COMPANY_ID) {
    const existing = await prisma.company.findUnique({
      where: { id: DEFAULT_COMPANY_ID },
    });
    if (existing) return existing;
  }
  const company = await prisma.company.create({
    data: { name: 'Empresa de Teste', cnpj: TEST_COMPANY_CNPJ },
  });
  DEFAULT_COMPANY_ID = company.id;
  return company;
}

export async function truncateAll(): Promise<void> {
  DEFAULT_COMPANY_ID = null;
  await prisma.notification.deleteMany();
  await prisma.tripPayment.deleteMany();
  await prisma.tripAdvance.deleteMany();
  await prisma.tripRefund.deleteMany();
  await prisma.fiscalValidation.deleteMany();
  await prisma.receiptOcr.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.tripParticipant.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.expenseCategoryLimit.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.permissionRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

export async function seedCategories(companyId?: string): Promise<void> {
  const targetId = companyId ?? (await defaultCompany()).id;
  const catalog = await prisma.expenseCategoryCatalog.findMany({
    where: { ativo: true },
    select: { code: true, name: true },
  });
  for (const category of catalog) {
    await prisma.expenseCategory.upsert({
      where: { companyId_code: { companyId: targetId, code: category.code } },
      update: {},
      create: { code: category.code, name: category.name, companyId: targetId },
    });
  }
}

export async function createCostCenter(nome: string, companyId?: string): Promise<unknown> {
  const { id } = companyId ? { id: companyId } : await defaultCompany();
  return prisma.costCenter.create({ data: { nome, companyId: id } });
}

export interface CreateUserOptions {
  email: string;
  password?: string;
  role?: RoleType;
  department?: DepartmentType;
  name?: string;
  cargo?: string;
  status?: 'ATIVO' | 'INATIVO';
  companyId?: string;
}

export async function createUser(options: CreateUserOptions) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: options.role ?? 'EMPLOYEE' } });
  const passwordHash = options.password ? await bcrypt.hash(options.password, 10) : null;
  const companyId = options.companyId ?? (await defaultCompany()).id;
  return prisma.user.create({
    data: {
      name: options.name ?? 'Usuário de Teste',
      email: options.email,
      department: options.department ?? 'COMERCIAL',
      cargo: options.cargo ?? 'Analista',
      roleId: role.id,
      companyId,
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
