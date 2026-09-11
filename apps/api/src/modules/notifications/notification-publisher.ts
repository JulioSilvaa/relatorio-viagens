import type { NotificationEventType } from '@prisma/client';

export interface NotificationInput {
  event: NotificationEventType;
  message: string;
  detail?: string;
  tripId?: string;
  userIds: string[];
}

export interface NotificationPublisher {
  notifyMany(input: NotificationInput): Promise<void>;
}
