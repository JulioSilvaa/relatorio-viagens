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

describe('km, taxa e diretório de colaboradores', () => {
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

  async function createTrip(
    session: Session,
    overrides: Record<string, unknown> = {},
  ): Promise<{ id: string; status: string }> {
    const res = await session.agent
      .post('/api/trips')
      .set('x-csrf-token', session.csrf)
      .send({
        cliente: 'Cliente ACME',
        cidade: 'São Paulo',
        uf: 'SP',
        dataSaida: '2026-09-01',
        dataRetorno: '2026-09-03',
        departamento: 'COMERCIAL',
        motivo: 'Visita comercial ao cliente ACME',
        ...overrides,
      });
    expect(res.status).toBe(201);
    return { id: res.body.data.trip.id, status: res.body.data.trip.status };
  }

  describe('CA-KM-002 - taxa por km manual definida por gestor/admin', () => {
    it('taxa informada tem prioridade sobre o valor automático', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const trip = await createTrip(session, {
        tipoVeiculo: 'PROPRIO',
        kmInicial: 1000,
        kmFinal: 1015,
        taxaKm: 1.5,
      });

      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(Number(saved.taxaKm)).toBe(1.5);
    });

    it('sem taxa informada, veículo próprio calcula automaticamente 0.60', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const trip = await createTrip(session, {
        tipoVeiculo: 'PROPRIO',
        kmInicial: 1000,
        kmFinal: 1015,
      });

      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(Number(saved.taxaKm)).toBe(0.6);
    });

    it('rejeita taxa não positiva', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const res = await session.agent.post('/api/trips').set('x-csrf-token', session.csrf).send({
        cliente: 'Cliente ACME',
        cidade: 'São Paulo',
        uf: 'SP',
        dataSaida: '2026-09-01',
        dataRetorno: '2026-09-03',
        departamento: 'COMERCIAL',
        motivo: 'Visita comercial ao cliente ACME',
        tipoVeiculo: 'PROPRIO',
        kmInicial: 1000,
        kmFinal: 1015,
        taxaKm: 0,
      });

      expect(res.status).toBe(422);
    });
  });

  describe('CA-KM-006/008 - validação de quilometragem', () => {
    it('rejeita km final anterior ao inicial', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const res = await session.agent.post('/api/trips').set('x-csrf-token', session.csrf).send({
        cliente: 'Cliente ACME',
        cidade: 'São Paulo',
        uf: 'SP',
        dataSaida: '2026-09-01',
        dataRetorno: '2026-09-03',
        departamento: 'COMERCIAL',
        motivo: 'Visita comercial ao cliente ACME',
        kmInicial: 1000,
        kmFinal: 900,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TRIP_INVALID_KMS');
    });

    it('rejeita quilometragem negativa', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const res = await session.agent.post('/api/trips').set('x-csrf-token', session.csrf).send({
        cliente: 'Cliente ACME',
        cidade: 'São Paulo',
        uf: 'SP',
        dataSaida: '2026-09-01',
        dataRetorno: '2026-09-03',
        departamento: 'COMERCIAL',
        motivo: 'Visita comercial ao cliente ACME',
        kmInicial: -5,
      });

      expect(res.status).toBe(422);
    });
  });

  describe('CA-USU-004 - diretório de colaboradores', () => {
    it('gestor lista colaboradores ativos ordenados por nome, não inclui inativos', async () => {
      await createUser({
        email: 'ana@empresa.com',
        password: 'ana-pw-123',
        role: 'EMPLOYEE',
        name: 'Marina Andrade',
      });
      await createUser({
        email: 'joao@empresa.com',
        password: 'joao-pw-123',
        role: 'EMPLOYEE',
        status: 'INATIVO',
        name: 'Bruno Silva',
      });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
        name: 'Rita Farias',
      });
      const session = await login('gestor@empresa.com', 'gestor-pw-123');

      const res = await session.agent.get('/api/users').set('x-csrf-token', session.csrf);

      expect(res.status).toBe(200);
      const users = res.body.data.users;
      expect(users.map((user: { name: string }) => user.name)).toEqual([
        'Marina Andrade',
        'Rita Farias',
      ]);
      expect(users.map((user: { roleCode: string }) => user.roleCode).sort()).toEqual([
        'EMPLOYEE',
        'MANAGER_ADMIN',
      ]);
      expect(
        users.every(
          (user: { id: string; name: string; email: string }) => user.id && user.name && user.email,
        ),
      ).toBe(true);
    });

    it('perfil sem a permissão de criação de viagem não acessa a lista de usuários', async () => {
      await createUser({
        email: 'fiscal@empresa.com',
        password: 'fiscal-pw-123',
        role: 'FISCAL',
      });
      const session = await login('fiscal@empresa.com', 'fiscal-pw-123');

      const res = await session.agent.get('/api/users').set('x-csrf-token', session.csrf);

      expect(res.status).toBe(403);
    });
  });

  describe('CA-VIA-016/020 - participantes somente em andamento', () => {
    it('rejeita adicionar participante após a entrega do relatório', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'carla@empresa.com', password: 'carla-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(session);

      const delivered = await session.agent
        .post(`/api/trips/${trip.id}/entregar`)
        .set('x-csrf-token', session.csrf);
      expect(delivered.status).toBe(204);

      const participant = (await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } }))
        .criadoPorId;
      const added = await session.agent
        .post(`/api/trips/${trip.id}/participants`)
        .set('x-csrf-token', session.csrf)
        .send({ userId: participant });

      expect(added.status).toBe(409);
      expect(added.body.error.code).toBe('TRIP_NOT_EDITABLE');
    });

    it('rejeita remover participante após a entrega do relatório', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'carla@empresa.com', password: 'carla-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');
      const carla = (await prisma.user.findUniqueOrThrow({ where: { email: 'carla@empresa.com' } }))
        .id;
      const trip = await createTrip(session);

      await session.agent
        .post(`/api/trips/${trip.id}/participants`)
        .set('x-csrf-token', session.csrf)
        .send({ userId: carla });

      await session.agent.post(`/api/trips/${trip.id}/entregar`).set('x-csrf-token', session.csrf);

      const removed = await session.agent
        .delete(`/api/trips/${trip.id}/participants/${carla}`)
        .set('x-csrf-token', session.csrf);

      expect(removed.status).toBe(409);
      expect(removed.body.error.code).toBe('TRIP_NOT_EDITABLE');
    });
  });
});
