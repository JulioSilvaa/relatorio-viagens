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

describe('marco 3: OCR, fiscal, financeiro, dashboard, histórico, auditoria e relatórios', () => {
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

  async function addExpense(session: Session, tripId: string, extra: Record<string, string> = {}) {
    const fields: Record<string, string> = {
      tripId,
      categoryCode: 'ALIMENTACAO',
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
    const res = await req.attach(
      'comprovantes',
      Buffer.from('%PNG-test-content'),
      'comprovante.png',
    );
    expect(res.status).toBe(201);
    return res.body.data.expense;
  }

  async function deliverAndApprove(ana: Session, gestor: Session, tripId: string): Promise<void> {
    const deliver = await ana.agent
      .post(`/api/trips/${tripId}/entregar`)
      .set('x-csrf-token', ana.csrf);
    expect(deliver.status).toBe(204);
    const approve = await gestor.agent
      .post(`/api/approvals/${tripId}/aprovar`)
      .set('x-csrf-token', gestor.csrf);
    expect(approve.status).toBe(204);
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(trip.status).toBe('APROVADA');
  }

  async function firstReceiptId(expenseId: string): Promise<string> {
    const receipt = await prisma.receipt.findFirst({ where: { expenseId } });
    expect(receipt).toBeTruthy();
    return receipt!.id;
  }

  describe('CA-OCR - extração e preenchimento manual', () => {
    it('extrai FALHA (neutro), preenche manualmente e registra auditoria', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      const expense = await addExpense(ana, trip.id);
      const receiptId = await firstReceiptId(expense.id);

      const initial = await ana.agent.get(`/api/ocr/receipts/${receiptId}`);
      expect(initial.status).toBe(200);
      expect(initial.body.data).toMatchObject({ status: 'PENDENTE' });

      const extract = await ana.agent
        .post(`/api/ocr/receipts/${receiptId}/extrair`)
        .set('x-csrf-token', ana.csrf);
      expect(extract.status).toBe(200);
      expect(extract.body.data).toMatchObject({
        status: 'FALHA',
        origem: 'MANUAL',
      });
      expect(extract.body.data.erro).toContain('OCR/IA');

      const save = await ana.agent
        .put(`/api/ocr/receipts/${receiptId}/dados`)
        .set('x-csrf-token', ana.csrf)
        .send({
          cnpj: '12.345.678/0001-90',
          nomeEstabelecimento: 'Restaurante X',
          data: '2026-09-02',
          valorTotal: 75,
          itens: [{ produto: 'Refeição' }],
        });
      expect(save.status).toBe(200);
      expect(save.body.data).toMatchObject({
        status: 'SUCESSO',
        origem: 'MANUAL',
        valorTotal: '75.00',
      });

      const repeated = await ana.agent
        .put(`/api/ocr/receipts/${receiptId}/dados`)
        .set('x-csrf-token', ana.csrf)
        .send({
          cnpj: '12.345.678/0001-90',
          nomeEstabelecimento: 'Restaurante X',
          data: '2026-09-02',
          valorTotal: 75,
          itens: [{ produto: 'Refeição' }],
        });
      expect(repeated.status).toBe(200);

      const saved = await prisma.receiptOcr.findUniqueOrThrow({ where: { receiptId } });
      expect(saved).toMatchObject({
        status: 'SUCESSO',
        origem: 'MANUAL',
        cnpj: '12.345.678/0001-90',
      });

      const ops = await prisma.auditEvent.findMany({ where: { entityId: receiptId } });
      expect(ops.map((op) => op.operation)).toContain('OCR.CORRIGIR');
      expect(ops.map((op) => op.operation)).toContain('OCR.CONFIRMAR');
    });

    it('nega acesso a quem não é participante nem fiscal', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'jose@empresa.com', password: 'jose-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const jose = await login('jose@empresa.com', 'jose-pw-123');
      const trip = await createTrip(ana);
      const expense = await addExpense(ana, trip.id);
      const receiptId = await firstReceiptId(expense.id);

      const res = await jose.agent.get(`/api/ocr/receipts/${receiptId}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('OCR_FORBIDDEN');
    });
  });

  describe('CA-FIS - validação fiscal de despesas', () => {
    it('valida despesa, exige motivo p/ problema e notifica o autor', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'fiscal@empresa.com', password: 'fisc-pw-123', role: 'FISCAL' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const fiscal = await login('fiscal@empresa.com', 'fisc-pw-123');
      const trip = await createTrip(ana);
      const expense = await addExpense(ana, trip.id);

      const pending = await fiscal.agent.get(`/api/fiscal/expenses/${expense.id}`);
      expect(pending.status).toBe(200);
      expect(pending.body.data).toMatchObject({ status: 'PENDENTE' });

      const validated = await fiscal.agent
        .patch(`/api/fiscal/expenses/${expense.id}`)
        .set('x-csrf-token', fiscal.csrf)
        .send({ status: 'VALIDO' });
      expect(validated.status).toBe(200);
      expect(validated.body.data).toMatchObject({ status: 'VALIDO' });

      const invalid = await fiscal.agent
        .patch(`/api/fiscal/expenses/${expense.id}`)
        .set('x-csrf-token', fiscal.csrf)
        .send({ status: 'PROBLEMA' });
      expect(invalid.status).toBe(422);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

      const problem = await fiscal.agent
        .patch(`/api/fiscal/expenses/${expense.id}`)
        .set('x-csrf-token', fiscal.csrf)
        .send({ status: 'PROBLEMA', motivo: 'Nota ilegível' });
      expect(problem.status).toBe(200);
      expect(problem.body.data).toMatchObject({ status: 'PROBLEMA', motivo: 'Nota ilegível' });

      const alert = await prisma.notification.findFirst({
        where: { event: 'PROBLEMA_FISCAL', tripId: trip.id },
      });
      expect(alert).toBeTruthy();
      expect(alert!.detail).toBe('Nota ilegível');
      expect(alert!.message).not.toContain('Nota ilegível');
    });

    it('bloqueia usuário sem permissão fiscal', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      const expense = await addExpense(ana, trip.id);

      const res = await ana.agent
        .patch(`/api/fiscal/expenses/${expense.id}`)
        .set('x-csrf-token', ana.csrf)
        .send({ status: 'VALIDO' });
      expect(res.status).toBe(403);
    });
  });

  describe('CA-FIN - fluxo financeiro de reembolso', () => {
    it('recebe, registra adiantamento, paga valor aprovado e registra devolução', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      await createUser({
        email: 'financeiro@empresa.com',
        password: 'fina-pw-123',
        role: 'FINANCE',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      const financeiro = await login('financeiro@empresa.com', 'fina-pw-123');

      const trip = await createTrip(ana);
      await addExpense(ana, trip.id);
      await addExpense(ana, trip.id, {
        valor: '25.00',
        reembolsavel: 'false',
        justificativa: 'Lanches não reembolsáveis',
      });

      const solicitado = await ana.agent
        .post(`/api/finance/trips/${trip.id}/adiantamento`)
        .set('x-csrf-token', ana.csrf)
        .send({
          valorSolicitado: 100,
          justificativaSolicitacao: 'Diárias e hospedagem antecipadas',
        });
      expect(solicitado.status).toBe(201);
      expect(solicitado.body.data.advance).toMatchObject({
        status: 'SOLICITADO',
        valorSolicitado: '100.00',
      });
      const advanceId = solicitado.body.data.advance.id as string;

      const duplicated = await ana.agent
        .post(`/api/finance/trips/${trip.id}/adiantamento`)
        .set('x-csrf-token', ana.csrf)
        .send({ valorSolicitado: 200, justificativaSolicitacao: 'Tentativa de novo adiantamento' });
      expect(duplicated.status).toBe(409);
      expect(duplicated.body.error.code).toBe('ADVANCE_ALREADY_REQUESTED');

      const prematurePay = await financeiro.agent
        .post(`/api/finance/adiantamentos/${advanceId}/pagamento`)
        .set('x-csrf-token', financeiro.csrf);
      expect(prematurePay.status).toBe(409);
      expect(prematurePay.body.error.code).toBe('ADVANCE_INVALID_STATUS');

      const excess = await gestor.agent
        .post(`/api/finance/adiantamentos/${advanceId}/analise`)
        .set('x-csrf-token', gestor.csrf)
        .send({
          aprovado: true,
          valorAprovado: 250,
          justificativaAnalise: 'Acima do solicitado',
        });
      expect(excess.status).toBe(409);
      expect(excess.body.error.code).toBe('ADVANCE_AMOUNT_EXCEEDS_REQUESTED');

      const aprovado = await gestor.agent
        .post(`/api/finance/adiantamentos/${advanceId}/analise`)
        .set('x-csrf-token', gestor.csrf)
        .send({
          aprovado: true,
          valorAprovado: 100,
          justificativaAnalise: 'Aprovado conforme solicitação',
        });
      expect(aprovado.status).toBe(200);
      expect(aprovado.body.data.advance.status).toBe('APROVADO');

      const pago = await financeiro.agent
        .post(`/api/finance/adiantamentos/${advanceId}/pagamento`)
        .set('x-csrf-token', financeiro.csrf)
        .send({ observacoesPagamento: 'PIX efetuado' });
      expect(pago.status).toBe(200);
      expect(pago.body.data.advance.status).toBe('PAGO');

      const advanceAlert = await prisma.notification.findFirst({
        where: { event: 'ADIANTAMENTO_PAGO' },
      });
      expect(advanceAlert).toBeTruthy();
      expect(advanceAlert!.detail).toBe('PIX efetuado');

      const notReceived = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/receber`)
        .set('x-csrf-token', financeiro.csrf);
      expect(notReceived.status).toBe(409);
      expect(notReceived.body.error.code).toBe('FINANCE_TRIP_NOT_APPROVED');

      await deliverAndApprove(ana, gestor, trip.id);

      const receive = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/receber`)
        .set('x-csrf-token', financeiro.csrf);
      expect(receive.status).toBe(204);

      const afterReceive = await financeiro.agent.get(`/api/finance/trips/${trip.id}`);
      expect(afterReceive.body.data).toMatchObject({
        totalAprovado: '75.00',
        totalAdiantamentos: '100.00',
        totalReembolsado: '0.00',
        valorADevolver: '25.00',
        valorAReembolsar: '75.00',
      });

      const wrongPayment = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/pagamento`)
        .set('x-csrf-token', financeiro.csrf)
        .send({ valor: 10, dataPagamento: '2026-09-10' });
      expect(wrongPayment.status).toBe(409);
      expect(wrongPayment.body.error.code).toBe('FINANCE_PAYMENT_VALUE_MISMATCH');

      const payment = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/pagamento`)
        .set('x-csrf-token', financeiro.csrf)
        .send({ valor: 75, dataPagamento: '2026-09-10' });
      expect(payment.status).toBe(200);

      const afterPayment = await financeiro.agent.get(`/api/finance/trips/${trip.id}`);
      expect(afterPayment.body.data).toMatchObject({
        totalReembolsado: '75.00',
        valorAReembolsar: '0.00',
      });

      const tripAfter = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
      expect(tripAfter.status).toBe('FINALIZADA');

      const paidAlert = await prisma.notification.findFirst({ where: { event: 'REEMBOLSO_PAGO' } });
      expect(paidAlert).toBeTruthy();

      const refund = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/devolucao`)
        .set('x-csrf-token', financeiro.csrf)
        .send({ valor: 25, data: '2026-09-11', metodoDePagamento: 'PIX' });
      expect(refund.status).toBe(200);
      expect(await prisma.tripRefund.count({ where: { tripId: trip.id } })).toBe(1);
    });

    it('exige status APROVADA para receber', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'financeiro@empresa.com',
        password: 'fina-pw-123',
        role: 'FINANCE',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const financeiro = await login('financeiro@empresa.com', 'fina-pw-123');
      const trip = await createTrip(ana);

      const res = await financeiro.agent
        .post(`/api/finance/trips/${trip.id}/receber`)
        .set('x-csrf-token', financeiro.csrf);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FINANCE_TRIP_NOT_APPROVED');
    });

    it('permite re-solicitar adiantamento após recusa e exige justificativa na análise', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      const trip = await createTrip(ana);

      const primeiro = await ana.agent
        .post(`/api/finance/trips/${trip.id}/adiantamento`)
        .set('x-csrf-token', ana.csrf)
        .send({
          valorSolicitado: 50,
          justificativaSolicitacao: 'Primeira solicitação',
        });
      expect(primeiro.status).toBe(201);
      const advanceId = primeiro.body.data.advance.id as string;

      const semJustificativa = await gestor.agent
        .post(`/api/finance/adiantamentos/${advanceId}/analise`)
        .set('x-csrf-token', gestor.csrf)
        .send({ aprovado: false, justificativaAnalise: 'X' });
      expect(semJustificativa.status).toBe(422);

      const recusado = await gestor.agent
        .post(`/api/finance/adiantamentos/${advanceId}/analise`)
        .set('x-csrf-token', gestor.csrf)
        .send({ aprovado: false, justificativaAnalise: 'Valor não justificado' });
      expect(recusado.status).toBe(200);
      expect(recusado.body.data.advance.status).toBe('RECUSADO');

      const segunda = await ana.agent
        .post(`/api/finance/trips/${trip.id}/adiantamento`)
        .set('x-csrf-token', ana.csrf)
        .send({
          valorSolicitado: 80,
          justificativaSolicitacao: 'Nova solicitação após ajuste',
        });
      expect(segunda.status).toBe(201);
      expect(segunda.body.data.advance.status).toBe('SOLICITADO');
    });
  });

  describe('CA-AUD - consulta de auditoria', () => {
    it('colaborador enxerga apenas a própria atuação; gestor vê tudo', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      await createTrip(ana);

      const own = await ana.agent.get('/api/audit');
      expect(own.status).toBe(200);
      const anaId = (await prisma.user.findUniqueOrThrow({ where: { email: 'ana@empresa.com' } }))
        .id;
      expect(own.body.data.total).toBeGreaterThan(0);
      for (const item of own.body.data.items) {
        expect(item.userId).toBe(anaId);
      }

      const managerAll = await gestor.agent.get('/api/audit');
      expect(managerAll.status).toBe(200);
      const hasAnaEvent = managerAll.body.data.items.some(
        (item: { userId: string }) => item.userId === anaId,
      );
      expect(hasAnaEvent).toBe(true);
    });
  });

  describe('CA-HIS - histórico e pesquisa', () => {
    it('respeita escopo e filtros de pesquisa', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'joao@empresa.com', password: 'joao-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const joao = await login('joao@empresa.com', 'joao-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      const tripAna = await createTrip(ana);
      await createTrip(joao, { cliente: 'Cliente Beta' });

      const own = await ana.agent.get('/api/trips/historico');
      expect(own.body.data).toEqual(expect.objectContaining({ total: 1 }));
      expect(own.body.data.items[0].id).toBe(tripAna.id);

      const filtered = await gestor.agent.get('/api/trips/historico?cliente=Beta');
      expect(filtered.body.data.total).toBe(1);
      expect(filtered.body.data.items[0].cliente).toBe('Cliente Beta');

      const paginated = await gestor.agent.get('/api/trips/historico?limite=1&deslocamento=0');
      expect(paginated.body.data.items).toHaveLength(1);
      expect(paginated.body.data.total).toBe(2);
    });
  });

  describe('CA-DASH - dashboard gerencial e do colaborador', () => {
    it('colaborador vê o próprio painel; gerencial exige permissão', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      await createTrip(ana);
      await addExpense(ana, (await createTrip(ana)).id);

      const me = await ana.agent.get('/api/dashboard/me');
      expect(me.status).toBe(200);
      expect(me.body.data.viagensEmAndamento).toBeGreaterThanOrEqual(1);

      const forbidden = await ana.agent.get('/api/dashboard/gerencial');
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.error.code).toBe('DASHBOARD_FORBIDDEN');

      const report = await gestor.agent.get(
        '/api/dashboard/gerencial?dataDe=2026-01-01&dataAte=2099-01-01',
      );
      expect(report.status).toBe(200);
      expect(report.body.data.totalDespesas).toBe('75.00');
      expect(report.body.data.quantidadeViagens).toBe(2);
      expect(report.body.data.adiantamentos).toEqual({
        totalSolicitado: '0.00',
        totalAprovado: '0.00',
        totalPago: '0.00',
        pendentesAnalise: 0,
      });
      expect(report.body.data.viagensPorDepartamento).toEqual([
        { departamento: 'COMERCIAL', quantidade: 2 },
      ]);
      expect(report.body.data.viagensPorRegiao).toEqual([{ regiao: 'Sudeste', quantidade: 2 }]);
      expect(report.body.data.cidadesMaisVisitadas).toMatchObject([
        { cidade: 'São Paulo', uf: 'SP', quantidade: 2 },
      ]);
      expect(report.body.data.viagensPorColaborador).toEqual([
        expect.objectContaining({ quantidade: 2 }),
      ]);
    });

    it('reembolsosStatus conta todas as viagens, independente do período', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      await createTrip(ana);
      await createTrip(ana, { dataSaida: '2026-01-01', dataRetorno: '2026-01-03' });

      const report = await gestor.agent.get('/api/dashboard/gerencial');
      expect(report.status).toBe(200);
      expect(report.body.data.quantidadeViagens).toBe(1);
      const totalPorStatus = report.body.data.reembolsosStatus.reduce(
        (acc: number, item: { status: string; quantidade: number }) => acc + item.quantidade,
        0,
      );
      expect(totalPorStatus).toBe(2);
    });
  });

  describe('CA-REL/EXP - relatórios PDF e exportação Excel', () => {
    it('gera PDF oficial somente após aprovação, registra versão na auditoria e bloqueia terceiros', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      await createUser({ email: 'fiscal@empresa.com', password: 'fisc-pw-123', role: 'FISCAL' });
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gest-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const fiscal = await login('fiscal@empresa.com', 'fisc-pw-123');
      const gestor = await login('gestor@empresa.com', 'gest-pw-123');
      const trip = await createTrip(ana);
      await addExpense(ana, trip.id);

      const beforeApproval = await ana.agent.get(`/api/reports/trips/${trip.id}/oficial`);
      expect(beforeApproval.status).toBe(422);
      expect(beforeApproval.body.error.code).toBe('RELATORIO_NAO_APROVADO');

      await deliverAndApprove(ana, gestor, trip.id);

      const pdf = await ana.agent.get(`/api/reports/trips/${trip.id}/oficial`);
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

      const pdf2 = await ana.agent.get(`/api/reports/trips/${trip.id}/oficial`);
      expect(pdf2.status).toBe(200);
      expect(pdf2.body).not.toEqual(pdf.body);

      const audit = await gestor.agent.get(
        `/api/audit?entidade=RELATORIO_OFICIAL&entidadeId=${trip.id}&operacao=GERAR`,
      );
      expect(audit.status).toBe(200);
      expect(audit.body.data.total).toBe(2);
      expect(
        audit.body.data.items.map((item: { newValue: string }) => item.newValue).sort(),
      ).toEqual(['v1', 'v2']);

      const manager = await gestor.agent.get(`/api/reports/trips/${trip.id}/gerencial`);
      expect(manager.status).toBe(200);
      expect(manager.headers['content-type']).toBe('application/pdf');

      const forbidden = await fiscal.agent.get(`/api/reports/trips/${trip.id}/oficial`);
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.error.code).toBe('RELATORIO_FORBIDDEN');
    });

    it('exporta Excel de despesas', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'ana-pw-123', role: 'EMPLOYEE' });
      const ana = await login('ana@empresa.com', 'ana-pw-123');
      const trip = await createTrip(ana);
      await addExpense(ana, trip.id);

      const res = await ana.agent.get('/api/exports/despesas');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(Number(res.headers['content-length'])).toBeGreaterThan(1000);
    });
  });
});
