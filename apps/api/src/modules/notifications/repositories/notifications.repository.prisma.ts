import { prisma } from '../../../config/database.js';
import type {
  NotificationInput,
  NotificationRecord,
  NotificationsRepository,
} from './notifications.repository.js';

export class PrismaNotificationsRepository implements NotificationsRepository {
  async createMany(inputs: ReadonlyArray<NotificationInput>): Promise<NotificationRecord[]> {
    if (inputs.length === 0) return [];
    const rows = await prisma.notification.createManyAndReturn({
      data: inputs.map((input) => ({
        userId: input.userId,
        event: input.event,
        message: input.message,
        detail: input.detail ?? null,
        tripId: input.tripId ?? null,
      })),
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      event: row.event,
      message: row.message,
      detail: row.detail,
      tripId: row.tripId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      event: row.event,
      message: row.message,
      detail: row.detail,
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

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
