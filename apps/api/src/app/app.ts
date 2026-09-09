import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from '../shared/http/error-handler.js';
import { ensureCsrfCookie } from '../shared/auth/csrf.js';
import type { createHealthRouter } from './container.js';

export interface AppDeps {
  healthRouter: ReturnType<typeof createHealthRouter>;
  authRouter: express.Router;
  usersRouter: express.Router;
  tripsRouter: express.Router;
  expensesRouter: express.Router;
  expenseCategoriesRouter: express.Router;
  expenseLimitsRouter: express.Router;
  receiptsRouter: express.Router;
  approvalsRouter: express.Router;
  costCentersRouter: express.Router;
  notificationsRouter: express.Router;
}

export function createApp({
  healthRouter,
  authRouter,
  usersRouter,
  tripsRouter,
  expensesRouter,
  expenseCategoriesRouter,
  expenseLimitsRouter,
  receiptsRouter,
  approvalsRouter,
  costCentersRouter,
  notificationsRouter,
}: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cookieParser());
  app.use(express.json());
  app.use(ensureCsrfCookie);

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/expenses-categories', expenseCategoriesRouter);
  app.use('/api/expense-limits', expenseLimitsRouter);
  app.use('/api', receiptsRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/cost-centers', costCentersRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
