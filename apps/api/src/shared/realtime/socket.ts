import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { SessionStore } from '../auth/session.js';
import { hashToken } from '../utils/crypto.js';

export interface NotificationRealtime {
  notifyUsers(userIds: string[]): void;
}

function sessionToken(cookieHeader: string | undefined): string | null {
  const value = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('vdr_session='));
  return value ? decodeURIComponent(value.slice('vdr_session='.length)) : null;
}

export class SocketNotificationRealtime implements NotificationRealtime {
  constructor(private readonly io: Server) {}

  notifyUsers(userIds: string[]): void {
    for (const userId of userIds) {
      this.io.to(`user:${userId}`).emit('notification.created');
    }
  }
}

export function createRealtimeServer(
  httpServer: HttpServer,
  sessions: SessionStore,
): SocketNotificationRealtime {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    void (async () => {
      const token = sessionToken(socket.handshake.headers.cookie);
      if (!token) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      const session = await sessions.findByTokenHash(hashToken(token));
      if (!session || session.expiresAt.getTime() < Date.now() || session.user.status !== 'ATIVO') {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      socket.data.userId = session.userId;
      next();
    })().catch(next);
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId as string}`);
  });

  return new SocketNotificationRealtime(io);
}
