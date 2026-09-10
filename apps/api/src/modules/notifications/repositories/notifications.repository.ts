import type { NotificationEventType } from '@prisma/client';

export interface NotificationRecord {
  id: string;
  event: NotificationEventType;
  message: string;
  tripId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationsRepository {
  createMany(
    inputs: ReadonlyArray<{
      userId: string;
      event: NotificationEventType;
      message: string;
      tripId?: string;
    }>,
  ): Promise<void>;
  listForUser(userId: string): Promise<NotificationRecord[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<boolean>;
  remove(id: string, userId: string): Promise<boolean>;
}
