import type { NotificationEventType } from '@prisma/client';

export interface NotificationRecord {
  id: string;
  userId: string;
  event: NotificationEventType;
  message: string;
  detail: string | null;
  tripId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationInput {
  userId: string;
  event: NotificationEventType;
  message: string;
  detail?: string;
  tripId?: string;
}

export interface NotificationsRepository {
  createMany(inputs: ReadonlyArray<NotificationInput>): Promise<NotificationRecord[]>;
  listForUser(userId: string): Promise<NotificationRecord[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<boolean>;
  remove(id: string, userId: string): Promise<boolean>;
}
