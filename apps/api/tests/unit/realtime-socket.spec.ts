import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createRealtimeServer } from '../../src/shared/realtime/socket.js';
import type { SocketNotificationRealtime } from '../../src/shared/realtime/socket.js';
import type { AuthSessionRecord, SessionStore } from '../../src/shared/auth/session.js';
import { hashToken } from '../../src/shared/utils/crypto.js';

class FakeSessionStore implements SessionStore {
  private sessions = new Map<string, AuthSessionRecord>();

  setSession(token: string, session: AuthSessionRecord): void {
    this.sessions.set(hashToken(token), session);
  }

  async revoke(sessionId: string, _revokedAt: Date): Promise<void> {
    for (const [key, session] of this.sessions.entries()) {
      if (session.id === sessionId) this.sessions.delete(key);
    }
  }

  async markActivity(): Promise<void> {}

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    return this.sessions.get(tokenHash) ?? null;
  }
}

function baseSession(overrides: Partial<AuthSessionRecord> = {}): AuthSessionRecord {
  return {
    id: 'session-1',
    userId: 'user-a',
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'user-a',
      name: 'Usuário A',
      email: 'a@teste.com',
      status: 'ATIVO',
      roleCode: 'EMPLOYEE',
      companyId: 'company-1',
      permissions: [],
    },
    ...overrides,
  };
}

function connectClient(port: number, token: string | null): ClientSocket {
  return ioClient(`http://127.0.0.1:${port}`, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    extraHeaders: token ? { cookie: `vdr_session=${encodeURIComponent(token)}` } : {},
  });
}

function waitFor<T = void>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('realtime socket (Socket.IO)', () => {
  let httpServer: HttpServer;
  let store: FakeSessionStore;
  let realtime: SocketNotificationRealtime;
  let port: number;
  let clients: ClientSocket[] = [];

  beforeEach(async () => {
    store = new FakeSessionStore();
    httpServer = createServer();
    realtime = createRealtimeServer(httpServer, store);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as { port: number }).port;
    clients = [];
  });

  afterEach(async () => {
    for (const client of clients) client.disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function track(client: ClientSocket): ClientSocket {
    clients.push(client);
    return client;
  }

  it('conecta e entra na própria sala com sessão válida', async () => {
    store.setSession('token-a', baseSession());
    const client = track(connectClient(port, 'token-a'));
    await waitFor(client, 'connect');
    expect(client.connected).toBe(true);
  });

  it('rejeita conexão sem cookie de sessão', async () => {
    const client = track(connectClient(port, null));
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('rejeita token de sessão desconhecido', async () => {
    const client = track(connectClient(port, 'token-inexistente'));
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('rejeita sessão expirada', async () => {
    store.setSession('token-expirado', baseSession({ expiresAt: new Date(Date.now() - 1000) }));
    const client = track(connectClient(port, 'token-expirado'));
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('rejeita usuário inativo', async () => {
    store.setSession(
      'token-inativo',
      baseSession({ user: { ...baseSession().user, status: 'INATIVO' } }),
    );
    const client = track(connectClient(port, 'token-inativo'));
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('isola notificações por usuário: um usuário nunca recebe evento de outro', async () => {
    store.setSession('token-a', baseSession({ id: 'session-a', userId: 'user-a' }));
    store.setSession(
      'token-b',
      baseSession({
        id: 'session-b',
        userId: 'user-b',
        user: { ...baseSession().user, id: 'user-b', email: 'b@teste.com' },
      }),
    );

    const clientA = track(connectClient(port, 'token-a'));
    const clientB = track(connectClient(port, 'token-b'));
    await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

    const receivedByA: unknown[] = [];
    const receivedByB: unknown[] = [];
    clientA.on('notification.created', (payload) => receivedByA.push(payload));
    clientB.on('notification.created', (payload) => receivedByB.push(payload));

    realtime.notifyUsers([
      {
        id: 'notif-1',
        event: 'VIAGEM_CRIADA',
        message: 'Nova viagem',
        detail: null,
        tripId: null,
        createdAt: new Date(),
        userId: 'user-a',
      },
    ]);

    await waitFor(clientA, 'notification.created');
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(receivedByA).toHaveLength(1);
    expect(receivedByB).toHaveLength(0);
  });

  it('revalida a sessão a cada nova conexão (reconexão pós-revogação é rejeitada)', async () => {
    store.setSession('token-a', baseSession({ id: 'session-a' }));
    const first = track(connectClient(port, 'token-a'));
    await waitFor(first, 'connect');
    first.disconnect();

    await store.revoke('session-a', new Date());

    const second = track(connectClient(port, 'token-a'));
    const error = await waitFor<Error>(second, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });
});
