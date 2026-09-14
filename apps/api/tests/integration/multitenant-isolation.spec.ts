import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type request from 'supertest';
import { prisma } from '../../src/config/database.js';
import {
  buildApp,
  createCostCenter,
  createUser,
  loginAs,
  seedBaseData,
  seedCategories,
  truncateAll,
} from '../helpers.js';

const app = buildApp();
type Agent = ReturnType<typeof request.agent>;
interface Session {
  agent: Agent;
  csrf: string;
}
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function createCompanyB(): Promise<{ id: string; name: string; cnpj: string }> {
  const company = await prisma.company.create({
    data: { name: 'Empresa B Ltda', cnpj: '88888888000191' },
  });
  await seedCategories(company.id);
  return company;
}

describe('isolamento multi-tenant (IDOR): empresa A vs B', () => {
  beforeEach(async () => {
    await truncateAll();
    await seedBaseData();
    await seedCategories();
  });

  afterEach(async () => {
    await truncateAll();
  });

  async function login(email: string, password: string): Promise<Session> {
    return loginAs(app, email, password);
  }

  async function createTrip(session: Session): Promise<string> {
    const res = await session.agent.post('/api/trips').set('x-csrf-token', session.csrf).send({
      cliente: 'Cliente ACME',
      cidade: 'São Paulo',
      uf: 'SP',
      dataSaida: '2026-09-01',
      dataRetorno: '2026-09-03',
      departamento: 'COMERCIAL',
      motivo: 'Visita comercial ao cliente ACME',
    });
    expect(res.status).toBe(201);
    return res.body.data.trip.id as string;
  }

  async function addExpense(session: Session, tripId: string): Promise<string> {
    let req = session.agent.post('/api/expenses').set('x-csrf-token', session.csrf);
    const fields: Record<string, string> = {
      tripId,
      categoryCode: 'ALIMENTACAO',
      valor: '75.00',
      dataDespesa: '2026-09-02',
      reembolsavel: 'true',
      justificativa: 'Refeições durante a viagem',
      tipoComprovante: 'NOTA_FISCAL',
    };
    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }
    const res = await req.attach('comprovante', VALID_PNG, 'comprovante.png');
    expect(res.status).toBe(201);
    return res.body.data.expense.id as string;
  }

  it('bloqueia acesso cruzado a viagens, despesas, aprovação, financeiro e relatório', async () => {
    await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
    await createUser({
      email: 'gestor@empresa.com',
      password: 'gest-pw-123',
      role: 'MANAGER_ADMIN',
    });
    const companyB = await createCompanyB();
    await createUser({
      email: 'b@empresa.com',
      password: 'bla-pw-1234',
      role: 'MANAGER_ADMIN',
      companyId: companyB.id,
    });

    const ana = await login('ana@empresa.com', 'ana-pw-123');
    await login('gestor@empresa.com', 'gest-pw-123');
    const b = await login('b@empresa.com', 'bla-pw-1234');

    const tripA = await createTrip(ana);
    const expenseA = await addExpense(ana, tripA);

    const cases: Array<{ method: string; path: string; status: number; code?: string }> = [
      { method: 'get', path: `/api/trips/${tripA}`, status: 404, code: 'TRIP_NOT_FOUND' },
      { method: 'patch', path: `/api/trips/${tripA}`, status: 404, code: 'TRIP_NOT_FOUND' },
      { method: 'delete', path: `/api/trips/${tripA}`, status: 404, code: 'TRIP_NOT_FOUND' },
      { method: 'post', path: `/api/trips/${tripA}/entregar`, status: 404, code: 'TRIP_NOT_FOUND' },
      { method: 'get', path: `/api/expenses/${expenseA}`, status: 404, code: 'EXPENSE_NOT_FOUND' },
      {
        method: 'delete',
        path: `/api/expenses/${expenseA}`,
        status: 404,
        code: 'EXPENSE_NOT_FOUND',
      },
      {
        method: 'patch',
        path: `/api/expenses/${expenseA}`,
        status: 404,
        code: 'EXPENSE_NOT_FOUND',
      },
      {
        method: 'post',
        path: `/api/approvals/${tripA}/aprovar`,
        status: 404,
        code: 'TRIP_NOT_FOUND',
      },
      { method: 'get', path: `/api/finance/trips/${tripA}`, status: 404, code: 'TRIP_NOT_FOUND' },
      {
        method: 'get',
        path: `/api/reports/trips/${tripA}/oficial`,
        status: 404,
        code: 'TRIP_NOT_FOUND',
      },
      {
        method: 'get',
        path: `/api/reports/trips/${tripA}/gerencial`,
        status: 404,
        code: 'TRIP_NOT_FOUND',
      },
    ];

    for (const tc of cases) {
      const res = await b.agent[tc.method as 'get'](tc.path).set('x-csrf-token', b.csrf);
      expect(res.status, `${tc.method.toUpperCase()} ${tc.path}`).toBe(tc.status);
      if (tc.code) {
        expect(res.body.error.code, `${tc.method.toUpperCase()} ${tc.path}`).toBe(tc.code);
      }
    }

    const receipt = await prisma.receipt.findFirstOrThrow({ where: { expenseId: expenseA } });
    const ocr = await b.agent.get(`/api/ocr/receipts/${receipt.id}`);
    expect([403, 404]).toContain(ocr.status);

    const excelB = await b.agent.get('/api/exports/despesas');
    expect(excelB.status).toBe(200);
  });

  it('não vaza centros de custo, cartões, categorias nem limites entre empresas', async () => {
    await createUser({
      email: 'gestor@empresa.com',
      password: 'gest-pw-123',
      role: 'MANAGER_ADMIN',
    });
    const companyB = await createCompanyB();
    await createUser({
      email: 'b@empresa.com',
      password: 'bla-pw-1234',
      role: 'MANAGER_ADMIN',
      companyId: companyB.id,
    });

    await login('gestor@empresa.com', 'gest-pw-123');
    const b = await login('b@empresa.com', 'bla-pw-1234');

    const centerA = (await createCostCenter('Centro A')) as { id: string };
    const gestorUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'gestor@empresa.com' },
    });
    const cardA = await prisma.creditCard.create({
      data: {
        companyId: gestorUser.companyId!,
        cardholderName: 'Gestor A',
        encryptedCardNumber: 'encrypted-overridden',
        last4: '1234',
        brand: 'VISA',
        createdById: gestorUser.id,
      },
    });
    await seedCategories(gestorUser.companyId!);
    const categoryA = await prisma.expenseCategory.create({
      data: {
        code: 'CAT_A_ONLY',
        name: 'Somente A',
        companyId: gestorUser.companyId!,
      },
    });

    const updateCenter = await b.agent
      .patch(`/api/cost-centers/${centerA.id}`)
      .set('x-csrf-token', b.csrf)
      .send({ nome: 'Invadido' });
    expect(updateCenter.status).toBe(404);
    expect(updateCenter.body.error.code).toBe('COST_CENTER_NOT_FOUND');

    const updateCard = await b.agent
      .put(`/api/credit-cards/${cardA.id}`)
      .set('x-csrf-token', b.csrf)
      .send({ cardholderName: 'Invadido' });
    expect(updateCard.status).toBe(404);
    expect(updateCard.body.error.code).toBe('CREDIT_CARD_NOT_FOUND');

    const centersB = await b.agent.get('/api/cost-centers').set('x-csrf-token', b.csrf);
    expect(centersB.status).toBe(200);
    expect(centersB.body.data.centers).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: centerA.id })]),
    );

    const cardsB = await b.agent.get('/api/credit-cards');
    expect(cardsB.body.data.cards).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cardA.id })]),
    );

    const categoriesB = await b.agent.get('/api/expenses-categories');
    expect(categoriesB.status).toBe(200);
    expect(categoriesB.body.data.categories).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: categoryA.code })]),
    );

    const limitsB = await b.agent.get('/api/expense-limits');
    expect(limitsB.body.data.limits).toEqual([]);
  });

  it('dashboard gerencial e histórico do gestor B não incluem dados da empresa A', async () => {
    await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
    await createUser({
      email: 'gestor@empresa.com',
      password: 'gest-pw-123',
      role: 'MANAGER_ADMIN',
    });
    const companyB = await createCompanyB();
    await createUser({
      email: 'b@empresa.com',
      password: 'bla-pw-1234',
      role: 'MANAGER_ADMIN',
      companyId: companyB.id,
    });

    const ana = await login('ana@empresa.com', 'ana-pw-123');
    await createTrip(ana);

    const b = await login('b@empresa.com', 'bla-pw-1234');
    const history = await b.agent.get('/api/trips/historico');
    expect(history.status).toBe(200);
    expect(history.body.data.total).toBe(0);

    const dashboard = await b.agent.get('/api/dashboard/gerencial');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.quantidadeViagens).toBe(0);
  });
});
