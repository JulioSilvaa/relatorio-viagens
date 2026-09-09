import { prisma } from '../../../config/database.js';
import type { NotificationEventType } from '@prisma/client';
import type { NotificationRecord, NotificationsRepository } from './notifications.repository.js';

interface NotificationInsert {
  userId: string;
  event: NotificationEventType;
  message: string;
  tripId?: string;
}

export class PrismaNotificationsRepository implements NotificationsRepository {
  async createMany(inputs: ReadonlyArray<NotificationInsert>): Promise<void> {
    if (inputs.length === 0) return;
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        event: input.event,
        message: input.message,
        tripId: input.tripId ?? null,
      })),
    });
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      event: row.event,
      message: row.message,
      tripId: row.tripId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return result.count > 0;
  }
}
