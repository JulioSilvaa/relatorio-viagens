import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from '../shared/http/error-handler.js';
import { ensureCsrfCookie } from '../shared/auth/csrf.js';
import type { createHealthRouter } from './container.js';

export interface AppDeps {
  healthRouter: ReturnType<typeof createHealthRouter>;
  authRouter: express.Router;
  usersRouter: express.Router;
}

export function createApp({ healthRouter, authRouter, usersRouter }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cookieParser());
  app.use(express.json());
  app.use(ensureCsrfCookie);

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
