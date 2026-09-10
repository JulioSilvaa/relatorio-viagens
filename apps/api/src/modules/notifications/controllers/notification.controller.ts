import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import type { NotificationsService } from '../services/notifications.service.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface NotificationsDeps {
  requireAuth: RequestHandler;
  notificationsService: NotificationsService;
}

export function createNotificationsRouter({
  requireAuth,
  notificationsService,
}: NotificationsDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(success(await notificationsService.listForUser(req.auth!.userId)));
    }),
  );

  router.get(
    '/nao-lidas',
    requireAuth,
    asyncHandler(async (req, res) => {
      const unread = await notificationsService.unreadCount(req.auth!.userId);
      res.json(success({ unread }));
    }),
  );

  router.patch(
    '/:id/lida',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const marked = await notificationsService.markRead(req.params.id!, req.auth!.userId);
      if (!marked) {
        throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notificação não encontrada.');
      }
      res.status(204).send();
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const removed = await notificationsService.remove(req.params.id!, req.auth!.userId);
      if (!removed) {
        throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notificação não encontrada.');
      }
      res.status(204).send();
    }),
  );

  return router;
}
