import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/database.js';
import { buildApp, createUser, loginAs, seedBaseData, truncateAll } from '../helpers.js';

const app = buildApp();

describe('credit cards', () => {
  beforeAll(async () => {
    await seedBaseData();
  });

  beforeEach(async () => {
    await truncateAll();
    await seedBaseData();
  });

  afterAll(async () => {
    await truncateAll();
    await prisma.$disconnect();
  });

  it('gestor cadastra e nunca recebe o número completo', async () => {
    await createUser({
      email: 'gestor@cartoes.test',
      password: 'senha-segura-123',
      role: 'MANAGER_ADMIN',
    });
    const { agent, csrf } = await loginAs(app, 'gestor@cartoes.test', 'senha-segura-123');

    const response = await agent
      .post('/api/credit-cards')
      .set('x-csrf-token', csrf)
      .send({ cardholderName: 'João Silva', cardNumber: '4111 1111 1111 1111' });

    expect(response.status).toBe(201);
    expect(response.body.data.card).toMatchObject({
      cardholderName: 'João Silva',
      last4: '1111',
      brand: 'VISA',
      active: true,
    });
    expect(JSON.stringify(response.body)).not.toContain('4111111111111111');
    expect(response.body.data.card.encryptedCardNumber).toBeUndefined();
  });

  it('colaborador não pode cadastrar cartão', async () => {
    await createUser({
      email: 'colaborador@cartoes.test',
      password: 'senha-segura-123',
      role: 'EMPLOYEE',
    });
    const { agent, csrf } = await loginAs(app, 'colaborador@cartoes.test', 'senha-segura-123');

    const response = await agent
      .post('/api/credit-cards')
      .set('x-csrf-token', csrf)
      .send({ cardholderName: 'João Silva', cardNumber: '4111111111111111' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('gestor desativa e reativa cartão sem apagar o registro', async () => {
    await createUser({
      email: 'gestor-status@cartoes.test',
      password: 'senha-segura-123',
      role: 'MANAGER_ADMIN',
    });
    const { agent, csrf } = await loginAs(app, 'gestor-status@cartoes.test', 'senha-segura-123');
    const created = await agent
      .post('/api/credit-cards')
      .set('x-csrf-token', csrf)
      .send({ cardholderName: 'Maria Souza', cardNumber: '5555555555554444' });
    const cardId = created.body.data.card.id as string;

    const inactive = await agent
      .patch(`/api/credit-cards/${cardId}/status`)
      .set('x-csrf-token', csrf)
      .send({ active: false });
    expect(inactive.status).toBe(200);
    expect(inactive.body.data.card.active).toBe(false);

    const active = await agent
      .patch(`/api/credit-cards/${cardId}/status`)
      .set('x-csrf-token', csrf)
      .send({ active: true });
    expect(active.status).toBe(200);
    expect(active.body.data.card.active).toBe(true);
    expect(await prisma.creditCard.count({ where: { id: cardId } })).toBe(1);
  });

  it('auditoria, resposta da API e notificações nunca contêm o número completo do cartão', async () => {
    await createUser({
      email: 'gestor-auditoria@cartoes.test',
      password: 'senha-segura-123',
      role: 'MANAGER_ADMIN',
    });
    const { agent, csrf } = await loginAs(app, 'gestor-auditoria@cartoes.test', 'senha-segura-123');

    const originalNumber = '4111111111111111';
    const created = await agent
      .post('/api/credit-cards')
      .set('x-csrf-token', csrf)
      .send({ cardholderName: 'Carlos Pereira', cardNumber: originalNumber });
    expect(created.status).toBe(201);
    const cardId = created.body.data.card.id as string;

    const newNumber = '5555555555554444';
    const updated = await agent
      .put(`/api/credit-cards/${cardId}`)
      .set('x-csrf-token', csrf)
      .send({ cardholderName: 'Carlos Pereira', cardNumber: newNumber });
    expect(updated.status).toBe(200);

    const deactivated = await agent
      .patch(`/api/credit-cards/${cardId}/status`)
      .set('x-csrf-token', csrf)
      .send({ active: false });
    expect(deactivated.status).toBe(200);

    const rawNumbers = [originalNumber, newNumber];

    const auditEvents = await prisma.auditEvent.findMany({
      where: { entityType: 'CARTAO_CORPORATIVO', entityId: cardId },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
    for (const event of auditEvents) {
      const serialized = JSON.stringify(event);
      for (const number of rawNumbers) {
        expect(serialized).not.toContain(number);
      }
    }

    const auditResponse = await agent.get('/api/audit').set('x-csrf-token', csrf);
    expect(auditResponse.status).toBe(200);
    const auditBody = JSON.stringify(auditResponse.body);
    for (const number of rawNumbers) {
      expect(auditBody).not.toContain(number);
    }

    const notifications = await prisma.notification.findMany({});
    for (const notification of notifications) {
      const serialized = JSON.stringify(notification);
      for (const number of rawNumbers) {
        expect(serialized).not.toContain(number);
      }
    }
  });
});
