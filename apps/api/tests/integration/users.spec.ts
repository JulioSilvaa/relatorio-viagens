import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/config/database.js';
import { buildApp, createUser, loginAs, seedBaseData, truncateAll } from '../helpers.js';

const app = buildApp();
const api = request(app);

describe('users', () => {
  beforeAll(async () => {
    await seedBaseData();
  });

  beforeEach(async () => {
    await truncateAll();
    await seedBaseData();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('CA-CAD-001 - cadastro de usuário', () => {
    it('1a: gestor cria usuário e sistema emite convite', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');

      const res = await agent.post('/api/users').set('x-csrf-token', csrf).send({
        name: 'Maria Souza',
        email: 'maria@empresa.com',
        department: 'TECNICO',
        cargo: 'Engenheira',
        roleCode: 'EMPLOYEE',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('maria@empresa.com');
      expect(res.body.data.user.roleCode).toBe('EMPLOYEE');
      expect(res.body.data.inviteToken).toBeTruthy();

      expect(await prisma.inviteToken.count()).toBe(1);
    });

    it('1b: e-mail duplicado retorna 409', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({ email: 'maria@empresa.com', role: 'EMPLOYEE' });
      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');

      const res = await agent.post('/api/users').set('x-csrf-token', csrf).send({
        name: 'Maria Souza',
        email: 'maria@empresa.com',
        department: 'TECNICO',
        cargo: 'Engenheira',
        roleCode: 'EMPLOYEE',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('USER_EMAIL_ALREADY_EXISTS');
    });

    it('RN-PER-004: colaborador sem permissão recebe 403', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'gestor-pw-123', role: 'EMPLOYEE' });
      const { agent, csrf } = await loginAs(app, 'ana@empresa.com', 'gestor-pw-123');

      const res = await agent.post('/api/users').set('x-csrf-token', csrf).send({
        name: 'Maria Souza',
        email: 'maria@empresa.com',
        department: 'TECNICO',
        cargo: 'Engenheira',
        roleCode: 'EMPLOYEE',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('payload inválido retorna 422', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');

      const res = await agent
        .post('/api/users')
        .set('x-csrf-token', csrf)
        .send({ name: 'M', email: 'invalido', department: 'RH', cargo: '', roleCode: 'NADA' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('não autenticado recebe 401', async () => {
      const res = await api.post('/api/users').send({
        name: 'Maria Souza',
        email: 'maria@empresa.com',
        department: 'TECNICO',
        cargo: 'Eng',
        roleCode: 'EMPLOYEE',
      });

      expect(res.status).toBe(401);
    });
  });
});
