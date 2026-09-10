import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type request from 'supertest';
import { prisma } from '../../src/config/database.js';
import {
  buildApp,
  createUser,
  loginAs,
  seedBaseData,
  seedCategories,
  truncateAll,
} from '../helpers.js';

const app: Express = buildApp();
type Agent = ReturnType<typeof request.agent>;

interface Session {
  agent: Agent;
  csrf: string;
}

describe('parâmetros globais do sistema (RF-CFG-001)', () => {
  beforeAll(async () => {
    await seedBaseData();
  });

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

  describe('CA-CFG-001 - valor de reembolso por km', () => {
    it('retorna o padrão 0.60 enquanto não configurado', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const session = await login('gestor@empresa.com', 'gestor-pw-123');

      const res = await session.agent.get('/api/settings').set('x-csrf-token', session.csrf);

      expect(res.status).toBe(200);
      expect(res.body.data.settings.kmReimbursementRate).toBe('0.60');
      expect(await prisma.systemSetting.count({ where: { key: 'KM_REIMBURSEMENT_RATE' } })).toBe(0);
    });

    it('gestor define o valor global e ele fica persistido', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const session = await login('gestor@empresa.com', 'gestor-pw-123');

      const res = await session.agent
        .put('/api/settings')
        .set('x-csrf-token', session.csrf)
        .send({ kmReimbursementRate: 1.5 });

      expect(res.status).toBe(200);
      expect(res.body.data.settings.kmReimbursementRate).toBe('1.5');

      const row = await prisma.systemSetting.findUniqueOrThrow({
        where: { key: 'KM_REIMBURSEMENT_RATE' },
      });
      expect(row.value).toBe('1.5');
    });

    it('rejeita valor não positivo', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const session = await login('gestor@empresa.com', 'gestor-pw-123');

      const res = await session.agent
        .put('/api/settings')
        .set('x-csrf-token', session.csrf)
        .send({ kmReimbursementRate: 0 });

      expect(res.status).toBe(422);
    });

    it('perfil sem a permissão não consulta nem altera', async () => {
      await createUser({ email: 'fiscal@empresa.com', password: 'fiscal-pw-123', role: 'FISCAL' });
      const session = await login('fiscal@empresa.com', 'fiscal-pw-123');

      const getRes = await session.agent.get('/api/settings').set('x-csrf-token', session.csrf);
      expect(getRes.status).toBe(403);

      const putRes = await session.agent
        .put('/api/settings')
        .set('x-csrf-token', session.csrf)
        .send({ kmReimbursementRate: 2 });
      expect(putRes.status).toBe(403);
    });
  });
});
