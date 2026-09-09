import type { NotificationEventType } from '@prisma/client';
import type { NotificationPublisher } from '../notification-publisher.js';
import type {
  NotificationRecord,
  NotificationsRepository,
} from '../repositories/notifications.repository.js';

export class NotificationsService implements NotificationPublisher {
  constructor(private readonly repository: NotificationsRepository) {}

  async notifyMany(input: {
    event: NotificationEventType;
    message: string;
    tripId?: string;
    userIds: string[];
  }): Promise<void> {
    if (input.userIds.length === 0) return;
    await this.repository.createMany(
      input.userIds.map((userId) => ({
        userId,
        event: input.event,
        message: input.message,
        tripId: input.tripId,
      })),
    );
  }

  createMany(
    inputs: ReadonlyArray<{
      userId: string;
      event: NotificationEventType;
      message: string;
      tripId?: string;
    }>,
  ): Promise<void> {
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
}
