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
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface Session {
  agent: Agent;
  csrf: string;
}

describe('marco 2: viagens, despesas e aprovações', () => {
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

  async function addExpense(
    session: Session,
    tripId: string,
    category = 'ALIMENTACAO',
    extra: Record<string, string> = {},
  ) {
    const fields: Record<string, string> = {
      tripId,
      categoryCode: category,
      valor: '75.00',
      dataDespesa: '2026-09-02',
      reembolsavel: 'true',
      justificativa: 'Refeições durante a viagem',
      tipoComprovante: 'NOTA_FISCAL',
      ...extra,
    };
    let req = session.agent.post('/api/expenses').set('x-csrf-token', session.csrf);
    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }
    return req.attach('comprovante', VALID_PNG, 'comprovante.png');
  }

  describe('CA-VIA-001 - criação de viagem', () => {
    it('cria viagem EM_ANDAMENTO com veículo próprio e taxaKm', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const trip = await createTrip(session, {
        tipoVeiculo: 'PROPRIO',
        kmInicial: 1000,
        kmFinal: 1015,
      });

      expect(trip.status).toBe('EM_ANDAMENTO');
      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(Number(saved.taxaKm)).toBe(0.6);
      expect(await prisma.tripParticipant.count({ where: { tripId: trip.id } })).toBe(1);
    });

    it('rejeita data de retorno anterior à saída', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const session = await login('ana@empresa.com', 'ana-pw-123');

      const res = await session.agent.post('/api/trips').set('x-csrf-token', session.csrf).send({
        cliente: 'Cliente ACME',
        cidade: 'São Paulo',
        uf: 'SP',
        dataSaida: '2026-09-05',
        dataRetorno: '2026-09-03',
        departamento: 'COMERCIAL',
        motivo: 'Visita comercial ao cliente ACME',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TRIP_INVALID_DATES');
    });
  });

  describe('CA-VIA-002 - edição de viagem', () => {
    it('criador pode editar enquanto EM_ANDAMENTO; outro participante não', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const res = await ana.agent
        .patch(`/api/trips/${trip.id}`)
        .set('x-csrf-token', ana.csrf)
        .send({ cidade: 'Campinas' });
      expect(res.status).toBe(200);
      expect(res.body.data.trip.cidade).toBe('Campinas');

      const forbidden = await joao.agent
        .patch(`/api/trips/${trip.id}`)
        .set('x-csrf-token', joao.csrf)
        .send({ cidade: 'Santos' });
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.error.code).toBe('TRIP_FORBIDDEN_EDIT');
    });
  });

  describe('CA-VIA-003 - participantes', () => {
    it('criador adiciona/remove, não remove criador e não deixa outros gerenciarem', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const carla = await createUser({
        email: 'carla@empresa.com',
        password: 'carla-pw-123',
        role: 'EMPLOYEE',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const added = await ana.agent
        .post(`/api/trips/${trip.id}/participants`)
        .set('x-csrf-token', ana.csrf)
        .send({ userId: carla.id });
      expect(added.status).toBe(201);
      expect(added.body.data.participant.name).toBe('Usuário de Teste');

      const duplicated = await ana.agent
        .post(`/api/trips/${trip.id}/participants`)
        .set('x-csrf-token', ana.csrf)
        .send({ userId: carla.id });
      expect(duplicated.status).toBe(409);
      expect(duplicated.body.error.code).toBe('TRIP_PARTICIPANT_EXISTS');

      const creatorId = (
        await prisma.trip.findUniqueOrThrow({
          where: { id: trip.id },
          select: { criadoPorId: true },
        })
      ).criadoPorId;
      const removeMe = await ana.agent
        .delete(`/api/trips/${trip.id}/participants/${creatorId}`)
        .set('x-csrf-token', ana.csrf);
      expect(removeMe.status).toBe(409);
      expect(removeMe.body.error.code).toBe('TRIP_REMOVE_CREATOR');

      const manageByOther = await joao.agent
        .post(`/api/trips/${trip.id}/participants`)
        .set('x-csrf-token', joao.csrf)
        .send({ userId: carla.id });
      expect(manageByOther.status).toBe(403);
      expect(manageByOther.body.error.code).toBe('TRIP_PARTICIPANT_FORBIDDEN');
    });
  });

  describe('CA-VIA-004 - entrega do relatório', () => {
    it('entrega sem pendências, notifica gestores e rejeita novo envio em EM_APROVACAO', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const res = await ana.agent
        .post(`/api/trips/${trip.id}/entregar`)
        .set('x-csrf-token', ana.csrf);
      expect(res.status).toBe(204);

      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(saved.status).toBe('EM_APROVACAO');

      const gestor = await prisma.user.findUniqueOrThrow({
        where: { email: 'gestor@empresa.com' },
      });
      expect(
        await prisma.notification.count({
          where: { userId: gestor.id, event: 'RELATORIO_ENTREGUE', tripId: trip.id },
        }),
      ).toBe(1);

      const again = await ana.agent
        .post(`/api/trips/${trip.id}/entregar`)
        .set('x-csrf-token', ana.csrf);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('TRIP_NOT_DELIVERABLE');

      const byOther = await joao.agent
        .post(`/api/trips/${trip.id}/entregar`)
        .set('x-csrf-token', joao.csrf);
      expect(byOther.status).toBe(409);
    });
  });

  describe('CA-VIA-005 - cancelamento', () => {
    it('cancela com motivo, exige motivo e impede cancelamento por outros', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const noReason = await ana.agent
        .post(`/api/trips/${trip.id}/cancelar`)
        .set('x-csrf-token', ana.csrf)
        .send({ motivo: 'x' });
      expect(noReason.status).toBe(422);

      const byOther = await joao.agent
        .post(`/api/trips/${trip.id}/cancelar`)
        .set('x-csrf-token', joao.csrf)
        .send({ motivo: 'Pedido do cliente' });
      expect(byOther.status).toBe(403);
      expect(byOther.body.error.code).toBe('TRIP_FORBIDDEN_CANCEL');

      const res = await ana.agent
        .post(`/api/trips/${trip.id}/cancelar`)
        .set('x-csrf-token', ana.csrf)
        .send({ motivo: 'Pedido do cliente' });
      expect(res.status).toBe(200);
      expect(res.body.data.trip.status).toBe('CANCELADA');
      expect(res.body.data.trip.motivoCancelamento).toBe('Pedido do cliente');
    });
  });

  describe('CA-VIA-006 - exclusão de viagem', () => {
    it('criador exclui somente EM_ANDAMENTO; outros recebem 403/409', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const byOther = await joao.agent
        .delete(`/api/trips/${trip.id}`)
        .set('x-csrf-token', joao.csrf);
      expect(byOther.status).toBe(403);
      expect(byOther.body.error.code).toBe('TRIP_FORBIDDEN_DELETE');

      const ok = await ana.agent.delete(`/api/trips/${trip.id}`).set('x-csrf-token', ana.csrf);
      expect(ok.status).toBe(204);
      expect(
        (await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).deletadoEm,
      ).toBeTruthy();
    });
  });

  describe('CA-DES-001 - criação de despesa', () => {
    it('participante cria despesa com comprovante; não participante recebe 403', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const trip = await createTrip(ana);

      const res = await addExpense(ana, trip.id);
      expect(res.status).toBe(201);
      expect(res.body.data.expense.tripId).toBe(trip.id);
      expect(res.body.data.expense.reembolsavel).toBe(true);
      expect(Number(res.body.data.expense.valor)).toBe(75);

      const blocked = await addExpense(joao, trip.id);
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('EXPENSE_FORBIDDEN');
    });

    it('despesa exige ao menos um comprovante', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);

      const res = await ana.agent
        .post('/api/expenses')
        .set('x-csrf-token', ana.csrf)
        .field('tripId', trip.id)
        .field('categoryCode', 'ALIMENTACAO')
        .field('valor', '75.00')
        .field('dataDespesa', '2026-09-02')
        .field('reembolsavel', 'true')
        .field('justificativa', 'Refeições durante a viagem')
        .field('tipoComprovante', 'NOTA_FISCAL');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXPENSE_RECEIPT_REQUIRED');
    });
  });

  describe('CA-DES-002 - edição de despesa', () => {
    it('autor edita o valor', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      const created = await addExpense(ana, trip.id);
      const expenseId = created.body.data.expense.id;

      const res = await ana.agent
        .patch(`/api/expenses/${expenseId}`)
        .set('x-csrf-token', ana.csrf)
        .send({ valor: 90.5 });
      expect(res.status).toBe(200);
      expect(Number(res.body.data.expense.valor)).toBe(90.5);
    });
  });

  describe('CA-DES-003 - exclusão de despesa', () => {
    it('autor exclui enquanto EM_ANDAMENTO; após entrega recebe 409', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      const created = await addExpense(ana, trip.id);
      const expenseId = created.body.data.expense.id;

      await ana.agent.post(`/api/trips/${trip.id}/entregar`).set('x-csrf-token', ana.csrf);
      const blocked = await ana.agent
        .delete(`/api/expenses/${expenseId}`)
        .set('x-csrf-token', ana.csrf);
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.code).toBe('EXPENSE_NOT_DELETABLE');
    });
  });

  describe('CA-KM-001 - reembolso por KM', () => {
    it('calcula valor automaticamente a partir da taxaKm da viagem', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana, {
        tipoVeiculo: 'PROPRIO',
        kmInicial: 1000,
        kmFinal: 1015,
      });

      const res = await ana.agent
        .post('/api/expenses')
        .set('x-csrf-token', ana.csrf)
        .field('tripId', trip.id)
        .field('categoryCode', 'KM_RODADOS')
        .field('valor', '0')
        .field('dataDespesa', '2026-09-02')
        .field('reembolsavel', 'true')
        .field('justificativa', 'Reembolso por quilometragem rodada')
        .field('tipoComprovante', 'OUTRO')
        .attach('comprovante', VALID_PNG, 'km.png');

      expect(res.status).toBe(201);
      expect(Number(res.body.data.expense.valor)).toBe(9);
    });
  });

  describe('CA-LIM-001/RN-DES-012 - limites por categoria', () => {
    it('gera alertaExcesso quando valor ultrapassa limite configurado', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const gestor = await login('gestor@empresa.com', 'gestor-pw-123');
      const ana = await login('ana@empresa.com', 'ana-pw-123');

      const category = await prisma.expenseCategory.findUniqueOrThrow({
        where: { code: 'ALIMENTACAO' },
      });
      const limit = await gestor.agent
        .put(`/api/expense-limits/categories/${category.id}`)
        .set('x-csrf-token', gestor.csrf)
        .send({ valor: 50 });
      expect(limit.status).toBe(200);
      expect(Number(limit.body.data.limit.valor)).toBe(50);

      const trip = await createTrip(ana);
      const res = await addExpense(ana, trip.id, 'ALIMENTACAO', { valor: '75.00' });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.expense.alertaExcesso)).toBe(25);
    });
  });

  describe('CA-CMP-001/002 - comprovantes', () => {
    it('anexa, substitui, desativa original e baixa arquivo', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      const created = await addExpense(ana, trip.id);
      const expenseId = created.body.data.expense.id;
      const receiptId = (await prisma.receipt.findFirstOrThrow({ where: { expenseId } })).id;

      const extra = await ana.agent
        .post(`/api/expenses/${expenseId}/receipts`)
        .set('x-csrf-token', ana.csrf)
        .field('tipoComprovante', 'CUPOM_FISCAL')
        .attach('comprovante', VALID_PNG, 'segunda.png');
      expect(extra.status).toBe(201);

      const file = await ana.agent.get(`/api/receipts/${receiptId}/arquivo`);
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toContain('image/png');

      const substitute = await ana.agent
        .post(`/api/expenses/${expenseId}/receipts/${receiptId}/substituir`)
        .set('x-csrf-token', ana.csrf)
        .field('tipoComprovante', 'NOTA_FISCAL')
        .attach('comprovante', VALID_PNG, 'nova.png');
      expect(substitute.status).toBe(200);

      const oldReceipt = await prisma.receipt.findUniqueOrThrow({ where: { id: receiptId } });
      expect(oldReceipt.ativo).toBe(false);
      const active = await prisma.receipt.findMany({ where: { expenseId, ativo: true } });
      expect(active).toHaveLength(2);
      expect(
        active.filter((receipt) => receipt.createdAt.getTime() > oldReceipt.createdAt.getTime()),
      ).toHaveLength(2);
    });
  });

  describe('CA-APR-002/003/004 - aprovação', () => {
    it('aprova e notifica financeiro; retorno exige justificativa e permite reenvio', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({
        email: 'financeiro@empresa.com',
        password: 'fin-pw-123',
        role: 'FINANCE',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gestor-pw-123');
      const trip = await createTrip(ana);

      const noJust = await gestor.agent
        .post(`/api/approvals/${trip.id}/retornar`)
        .set('x-csrf-token', gestor.csrf)
        .send({ justificativa: 'x' });
      expect(noJust.status).toBe(422);
      expect(noJust.body.error.code).toBe('VALIDATION_ERROR');

      await ana.agent.post(`/api/trips/${trip.id}/entregar`).set('x-csrf-token', ana.csrf);

      const retornar = await gestor.agent
        .post(`/api/approvals/${trip.id}/retornar`)
        .set('x-csrf-token', gestor.csrf)
        .send({ justificativa: 'Comprovantes ilegíveis' });
      expect(retornar.status).toBe(204);
      expect((await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).status).toBe(
        'EM_CORRECAO',
      );

      const returnedAlert = await prisma.notification.findFirst({
        where: { event: 'RELATORIO_RETORNADO', tripId: trip.id },
      });
      expect(returnedAlert).toBeTruthy();
      expect(returnedAlert!.detail).toBe('Comprovantes ilegíveis');

      const reenviar = await ana.agent
        .post(`/api/trips/${trip.id}/entregar`)
        .set('x-csrf-token', ana.csrf);
      expect(reenviar.status).toBe(204);

      const gestorRow = await prisma.user.findUniqueOrThrow({
        where: { email: 'gestor@empresa.com' },
      });
      expect(
        await prisma.notification.count({
          where: { userId: gestorRow.id, tripId: trip.id, event: 'RELATORIO_REENVIADO' },
        }),
      ).toBe(1);

      const aprovar = await gestor.agent
        .post(`/api/approvals/${trip.id}/aprovar`)
        .set('x-csrf-token', gestor.csrf);
      expect(aprovar.status).toBe(204);
      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(saved.status).toBe('APROVADA');

      const fin = await prisma.user.findUniqueOrThrow({
        where: { email: 'financeiro@empresa.com' },
      });
      expect(
        await prisma.notification.count({
          where: { userId: fin.id, tripId: trip.id, event: 'RELATORIO_APROVADO' },
        }),
      ).toBe(1);
    });
  });

  describe('CA-CC-001 - centros de custo e notificações', () => {
    it('gestor gerencia centros; colaborador lista ativos', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const gestor = await login('gestor@empresa.com', 'gestor-pw-123');
      const ana = await login('ana@empresa.com', 'ana-pw-123');

      const created = await gestor.agent
        .post('/api/cost-centers')
        .set('x-csrf-token', gestor.csrf)
        .send({ nome: 'Diretoria Comercial' });
      expect(created.status).toBe(201);

      const center = await prisma.costCenter.findFirstOrThrow();
      const list = await ana.agent.get('/api/cost-centers');
      expect(list.status).toBe(200);
      expect(list.body.data.centers).toHaveLength(1);

      const deactivate = await gestor.agent
        .patch(`/api/cost-centers/${center.id}`)
        .set('x-csrf-token', gestor.csrf)
        .send({ ativo: false });
      expect(deactivate.status).toBe(200);
      expect(deactivate.body.data.center.ativo).toBe(false);

      const listAgain = await ana.agent.get('/api/cost-centers');
      expect(listAgain.body.data.centers).toHaveLength(0);
    });

    it('inbox: lista, conta não lidas e marca como lida', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gestor-pw-123');
      const trip = await createTrip(ana);

      await ana.agent.post(`/api/trips/${trip.id}/entregar`).set('x-csrf-token', ana.csrf);

      const gestorRow = await prisma.user.findUniqueOrThrow({
        where: { email: 'gestor@empresa.com' },
      });
      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: gestorRow.id },
      });

      const unread = await gestor.agent.get('/api/notifications/nao-lidas');
      expect(unread.status).toBe(200);
      expect(unread.body.data.unread).toBe(2);

      const inbox = await gestor.agent.get('/api/notifications');
      expect(inbox.status).toBe(200);
      expect(inbox.body.data).toHaveLength(2);
      expect(inbox.body.data[0].event).toBe('RELATORIO_ENTREGUE');

      const read = await gestor.agent
        .patch(`/api/notifications/${notification.id}/lida`)
        .set('x-csrf-token', gestor.csrf);
      expect(read.status).toBe(204);
      expect(
        (await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).readAt,
      ).toBeTruthy();
    });

    it('inbox: remove notificação própria e impede remoção de outro usuário', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gestor-pw-123');
      const trip = await createTrip(ana);

      await ana.agent.post(`/api/trips/${trip.id}/entregar`).set('x-csrf-token', ana.csrf);

      const gestorRow = await prisma.user.findUniqueOrThrow({
        where: { email: 'gestor@empresa.com' },
      });
      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: gestorRow.id },
      });

      const cross = await ana.agent
        .delete(`/api/notifications/${notification.id}`)
        .set('x-csrf-token', ana.csrf);
      expect(cross.status).toBe(404);

      const removed = await gestor.agent
        .delete(`/api/notifications/${notification.id}`)
        .set('x-csrf-token', gestor.csrf);
      expect(removed.status).toBe(204);
      expect(await prisma.notification.findUnique({ where: { id: notification.id } })).toBeNull();
    });
  });
});
