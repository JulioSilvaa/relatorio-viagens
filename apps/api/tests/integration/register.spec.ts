import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/config/database.js';
import { buildApp } from '../helpers.js';
import { truncateAll, seedBaseData, seedCategories } from '../helpers.js';

describe('POST /api/auth/register', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await truncateAll();
    await seedBaseData();
    await seedCategories();
  });

  afterEach(async () => {
    await truncateAll();
  });

  const payload = {
    name: 'João Silva',
    email: 'joao@empresa.com.br',
    password: 'senha1234',
    companyName: 'Empresa Ltda',
    cnpj: '11.222.333/0001-81',
  };

  it('cria conta + empresa + auto-login (201 + set-cookie)', async () => {
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('joao@empresa.com.br');
    expect(res.body.data.user.roleCode).toBe('MANAGER_ADMIN');

    const setCookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie']];
    expect(setCookie.some((c: string) => c.startsWith('vdr_session='))).toBe(true);

    const company = await prisma.company.findUnique({
      where: { cnpj: '11222333000181' },
    });
    expect(company).not.toBeNull();
    const catalogCount = await prisma.expenseCategoryCatalog.count({ where: { ativo: true } });
    const categoryCount = await prisma.expenseCategory.count({
      where: { companyId: company!.id },
    });
    expect(categoryCount).toBe(catalogCount);
    expect(catalogCount).toBeGreaterThan(0);
  });

  it('rejeita e-mail duplicado (409 USER_EMAIL_ALREADY_EXISTS)', async () => {
    await request(app).post('/api/auth/register').send(payload);

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, name: 'João Silva 2', cnpj: '11.222.333/0002-62' });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('USER_EMAIL_ALREADY_EXISTS');
    expect(res2.body.error.message).toBe('E-mail já cadastrado.');
  });

  it('rejeita CNPJ duplicado (409 COMPANY_CNPJ_ALREADY_USED)', async () => {
    await request(app).post('/api/auth/register').send(payload);

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, name: 'Maria Silva', email: 'maria@empresa.com.br' });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('COMPANY_CNPJ_ALREADY_USED');
    expect(res2.body.error.message).toBe('CNPJ já cadastrado.');
  });

  it('rejeita CNPJ inválido (422 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, cnpj: '11.222.333/0001-00' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields?.cnpj).toBe('CNPJ inválido');
  });

  it('rejeita senha curta (422 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, password: '123' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields?.password).toBeDefined();
  });
});
