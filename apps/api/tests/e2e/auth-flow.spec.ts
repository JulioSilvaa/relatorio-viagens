import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  buildApp,
  createUser,
  getCsrfValue,
  loginAs,
  seedBaseData,
  truncateAll,
} from '../helpers.js';

const app = buildApp();

describe('e2e: fluxo de autenticação', () => {
  beforeAll(async () => {
    await seedBaseData();
  });

  beforeEach(async () => {
    await truncateAll();
    await seedBaseData();
  });

  it('gestor cadastra colaborador, colaborador aceita convite e navega no sistema', async () => {
    const admin = await createUser({
      email: 'gestor@empresa.com',
      password: 'gestor-123',
      role: 'MANAGER_ADMIN',
    });

    const { agent, csrf } = await loginAs(app, admin.email, 'gestor-123');
    const meAdmin = await agent.get('/api/auth/me');
    expect(meAdmin.body.data.user.roleCode).toBe('MANAGER_ADMIN');

    const created = await agent.post('/api/users').set('x-csrf-token', csrf).send({
      name: 'Maria Souza',
      email: 'maria@empresa.com',
      department: 'TECNICO',
      cargo: 'Engenheira',
      roleCode: 'EMPLOYEE',
    });
    expect(created.status).toBe(201);
    const inviteToken = created.body.data.inviteToken;

    await agent.post('/api/auth/logout').set('x-csrf-token', csrf);

    const anonAgent = request.agent(app);
    const csrfInvite = await getCsrfValue(anonAgent);
    const accepted = await anonAgent
      .post('/api/auth/accept-invite')
      .set('x-csrf-token', csrfInvite)
      .send({ token: inviteToken, password: 'colaborador-123' });
    expect(accepted.status).toBe(204);

    const { agent: employeeAgent, csrf: employeeCsrf } = await loginAs(
      app,
      'maria@empresa.com',
      'colaborador-123',
    );
    const me = await employeeAgent.get('/api/auth/me');
    expect(me.body.data.user.email).toBe('maria@empresa.com');
    expect(me.body.data.user.roleCode).toBe('EMPLOYEE');

    const denied = await employeeAgent.post('/api/users').set('x-csrf-token', employeeCsrf).send({
      name: 'Outro',
      email: 'outro@empresa.com',
      department: 'COMERCIAL',
      cargo: 'Analista',
      roleCode: 'EMPLOYEE',
    });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');
  });
});
