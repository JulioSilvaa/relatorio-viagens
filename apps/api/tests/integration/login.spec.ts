import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { generateSecureToken, hashToken } from '../../src/shared/utils/crypto.js';
import {
  buildApp,
  createUser,
  getCsrfValue,
  loginAs,
  seedBaseData,
  truncateAll,
} from '../helpers.js';

const app = buildApp();
const api = request(app);

describe('auth', () => {
  beforeAll(async () => {
    await seedBaseData();
  });

  beforeEach(async () => {
    await truncateAll();
    await seedBaseData();
  });

  describe('CA-AUTH-001 - login RFID', () => {
    it('1a: credenciais válidas autenticam e criam sessão', async () => {
      await createUser({
        email: 'ana@empresa.com',
        password: 'senha-valida-123',
        role: 'EMPLOYEE',
      });

      const res = await api
        .post('/api/auth/login')
        .send({ email: 'ana@empresa.com', password: 'senha-valida-123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('ana@empresa.com');
      expect(res.body.data.user.status).toBe('ATIVO');

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.some((c) => c.startsWith('vdr_session='))).toBe(true);
      expect(await prisma.session.count()).toBe(1);
    });

    it('1b: senha incorreta retorna 401 sem criar sessão', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });

      const res = await api
        .post('/api/auth/login')
        .send({ email: 'ana@empresa.com', password: 'senha-errada' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(await prisma.session.count()).toBe(0);
    });

    it('RN-AUTH-002: usuário inativo não autentica', async () => {
      await createUser({
        email: 'ana@empresa.com',
        password: 'senha-valida-123',
        status: 'INATIVO',
      });

      const res = await api
        .post('/api/auth/login')
        .send({ email: 'ana@empresa.com', password: 'senha-valida-123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_USER_INACTIVE');
    });
  });

  describe('RF-AUTH-002 - convite de acesso', () => {
    async function createInviteFor(
      userId: string,
      opts: { used?: boolean; expired?: boolean } = {},
    ) {
      const raw = generateSecureToken();
      await prisma.inviteToken.create({
        data: {
          userId,
          tokenHash: hashToken(raw),
          expiresAt: opts.expired
            ? new Date(Date.now() - 60_000)
            : new Date(Date.now() + 3_600_000),
          usedAt: opts.used ? new Date() : null,
        },
      });
      return raw;
    }

    it('aceita convite e habilita login', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const user = await createUser({ email: 'novo@empresa.com', role: 'EMPLOYEE' });
      const rawInvite = await createInviteFor(user.id);

      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');
      const res = await agent
        .post('/api/auth/accept-invite')
        .set('x-csrf-token', csrf)
        .send({ token: rawInvite, password: 'nova-senha-123' });

      expect(res.status).toBe(204);
      expect(user.passwordHash).toBeNull();

      const login = await api
        .post('/api/auth/login')
        .send({ email: 'novo@empresa.com', password: 'nova-senha-123' });
      expect(login.status).toBe(200);
      expect((await prisma.inviteToken.findFirstOrThrow()).usedAt).not.toBeNull();
    });

    it('recusa convite já utilizado', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const user = await createUser({ email: 'novo@empresa.com' });
      const rawInvite = await createInviteFor(user.id, { used: true });

      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');
      const res = await agent
        .post('/api/auth/accept-invite')
        .set('x-csrf-token', csrf)
        .send({ token: rawInvite, password: 'nova-senha-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVITE_ALREADY_USED');
    });

    it('recusa convite expirado', async () => {
      await createUser({
        email: 'gestor@empresa.com',
        password: 'gestor-pw-123',
        role: 'MANAGER_ADMIN',
      });
      const user = await createUser({ email: 'novo@empresa.com' });
      const rawInvite = await createInviteFor(user.id, { expired: true });

      const { agent, csrf } = await loginAs(app, 'gestor@empresa.com', 'gestor-pw-123');
      const res = await agent
        .post('/api/auth/accept-invite')
        .set('x-csrf-token', csrf)
        .send({ token: rawInvite, password: 'nova-senha-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVITE_EXPIRED');
    });
  });

  describe('RF-AUTH-003 - recuperação de senha', () => {
    async function createResetFor(userId: string) {
      const raw = generateSecureToken();
      await prisma.passwordResetToken.create({
        data: { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3_600_000) },
      });
      return raw;
    }

    it('forgot-password responde 202 genérico e cria token para usuário existente', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });
      const agent = request.agent(app);
      const csrf = await getCsrfValue(agent);

      const res = await agent
        .post('/api/auth/forgot-password')
        .set('x-csrf-token', csrf)
        .send({ email: 'ana@empresa.com' });

      expect(res.status).toBe(202);
      expect(await prisma.passwordResetToken.count()).toBe(1);
    });

    it('não revela existência de e-mail desconhecido', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfValue(agent);

      const res = await agent
        .post('/api/auth/forgot-password')
        .set('x-csrf-token', csrf)
        .send({ email: 'nao-existe@empresa.com' });

      expect(res.status).toBe(202);
      expect(await prisma.passwordResetToken.count()).toBe(0);
    });

    it('RN-AUTH-010..012: reset troca senha, revoga sessões e invalida token', async () => {
      const user = await createUser({ email: 'ana@empresa.com', password: 'senha-velha-123' });
      const { agent, csrf } = await loginAs(app, 'ana@empresa.com', 'senha-velha-123');
      expect(await prisma.session.count()).toBe(1);

      const rawToken = await createResetFor(user.id);

      const res = await agent
        .post('/api/auth/reset-password')
        .set('x-csrf-token', csrf)
        .send({ token: rawToken, password: 'senha-nova-123' });

      expect(res.status).toBe(204);
      expect((await prisma.passwordResetToken.findFirstOrThrow()).usedAt).not.toBeNull();

      const oldLogin = await api
        .post('/api/auth/login')
        .send({ email: 'ana@empresa.com', password: 'senha-velha-123' });
      expect(oldLogin.status).toBe(401);

      const newLogin = await api
        .post('/api/auth/login')
        .send({ email: 'ana@empresa.com', password: 'senha-nova-123' });
      expect(newLogin.status).toBe(200);
    });

    it('recusa token de reset inválido', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfValue(agent);

      const res = await agent
        .post('/api/auth/reset-password')
        .set('x-csrf-token', csrf)
        .send({ token: 'token-inexistente', password: 'senha-nova-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('RESET_TOKEN_INVALID');
    });
  });

  describe('sessão', () => {
    it('me retorna usuário autenticado', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });
      const { agent } = await loginAs(app, 'ana@empresa.com', 'senha-valida-123');

      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('ana@empresa.com');
    });

    it('logout revoga sessão', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });
      const { agent, csrf } = await loginAs(app, 'ana@empresa.com', 'senha-valida-123');

      const logout = await agent.post('/api/auth/logout').set('x-csrf-token', csrf);
      expect(logout.status).toBe(204);

      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(401);
      expect((await prisma.session.findFirstOrThrow()).revokedAt).not.toBeNull();
    });

    it('sessão expira por inatividade (idle timeout)', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });
      const { agent } = await loginAs(app, 'ana@empresa.com', 'senha-valida-123');

      const idleMs = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;
      await prisma.session.updateMany({
        data: { lastActivityAt: new Date(Date.now() - idleMs - 60_000) },
      });

      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
    });

    it('POST sem header CSRF é bloqueado (403)', async () => {
      await createUser({ email: 'ana@empresa.com', password: 'senha-valida-123' });
      const { agent } = await loginAs(app, 'ana@empresa.com', 'senha-valida-123');

      const res = await agent.post('/api/auth/logout').send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('POST sem cookie CSRF é bloqueado (403)', async () => {
      const agent = request.agent(app);
      const res = await agent
        .post('/api/auth/forgot-password')
        .send({ email: 'nao-existe@empresa.com' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });
  });
});
