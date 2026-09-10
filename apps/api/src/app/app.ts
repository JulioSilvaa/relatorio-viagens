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
  ocrRouter: express.Router;
  fiscalRouter: express.Router;
  auditRouter: express.Router;
  settingsRouter: express.Router;
  financeRouter: express.Router;
  dashboardRouter: express.Router;
  reportsRouter: express.Router;
  exportsRouter: express.Router;
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
  ocrRouter,
  fiscalRouter,
  auditRouter,
  settingsRouter,
  financeRouter,
  dashboardRouter,
  reportsRouter,
  exportsRouter,
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
  app.use('/api/ocr', ocrRouter);
  app.use('/api/fiscal', fiscalRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/exports', exportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
