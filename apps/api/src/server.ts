import { env, isTest } from './config/env.js';
import { logger } from './shared/logger.js';
import { createApp } from './app/app.js';
import { buildContainer, createHealthRouter } from './app/container.js';
import { prisma } from './config/database.js';
import type { Container } from './app/container.js';

export function mountApp(container: Container) {
  return createApp({
    healthRouter: createHealthRouter(),
    authRouter: container.authRouter,
    usersRouter: container.usersRouter,
    tripsRouter: container.tripsRouter,
    expensesRouter: container.expensesRouter,
    expenseCategoriesRouter: container.expenseCategoriesRouter,
    expenseLimitsRouter: container.expenseLimitsRouter,
    receiptsRouter: container.receiptsRouter,
    approvalsRouter: container.approvalsRouter,
    costCentersRouter: container.costCentersRouter,
    notificationsRouter: container.notificationsRouter,
  });
}

function main(): void {
  const container = buildContainer();
  const app = mountApp(container);

  app.listen(env.PORT, () => {
    logger.info('API iniciada', { port: env.PORT, nodeEnv: env.NODE_ENV });
  });
}

if (!isTest) {
  main();
}

process.on('SIGINT', () => {
  void prisma.$disconnect().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void prisma.$disconnect().then(() => process.exit(0));
});
