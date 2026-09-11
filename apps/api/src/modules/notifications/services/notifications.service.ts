import type { NotificationEventType } from '@prisma/client';
import type { NotificationPublisher } from '../notification-publisher.js';
import type { NotificationRealtime } from '../../../shared/realtime/socket.js';
import type {
  NotificationRecord,
  NotificationsRepository,
} from '../repositories/notifications.repository.js';

export class NotificationsService implements NotificationPublisher {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly realtime?: NotificationRealtime,
  ) {}

  async notifyMany(input: {
    event: NotificationEventType;
    message: string;
    detail?: string;
    tripId?: string;
    userIds: string[];
  }): Promise<void> {
    if (input.userIds.length === 0) return;
    const records = await this.repository.createMany(
      input.userIds.map((userId) => ({
        userId,
        event: input.event,
        message: input.message,
        detail: input.detail,
        tripId: input.tripId,
      })),
    );
    this.realtime?.notifyUsers(
      records.map((record) => ({
        userId: record.userId,
        id: record.id,
        event: record.event,
        message: record.message,
        detail: record.detail,
        tripId: record.tripId,
        createdAt: record.createdAt,
      })),
    );
  }

  createMany(
    inputs: ReadonlyArray<{
      userId: string;
      event: NotificationEventType;
      message: string;
      detail?: string;
      tripId?: string;
    }>,
  ): Promise<NotificationRecord[]> {
    return this.repository.createMany(inputs);
  }

  listForUser(userId: string): Promise<NotificationRecord[]> {
    return this.repository.listForUser(userId);
  }

  unreadCount(userId: string): Promise<number> {
    return this.repository.unreadCount(userId);
  }

  markRead(id: string, userId: string): Promise<boolean> {
    return this.repository.markRead(id, userId);
  }

  remove(id: string, userId: string): Promise<boolean> {
    return this.repository.remove(id, userId);
  }
}
