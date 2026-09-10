import { env, isTest } from './config/env.js';
import { logger } from './shared/logger.js';
import { createApp } from './app/app.js';
import { buildContainer, createHealthRouter } from './app/container.js';
import { prisma } from './config/database.js';
import type { Container } from './app/container.js';
import { createServer } from 'node:http';
import { createRealtimeServer } from './shared/realtime/socket.js';
import { PrismaSessionsRepository } from './modules/auth/repositories/auth.repository.prisma.js';

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
    creditCardsRouter: container.creditCardsRouter,
    notificationsRouter: container.notificationsRouter,
    ocrRouter: container.ocrRouter,
    fiscalRouter: container.fiscalRouter,
    auditRouter: container.auditRouter,
    settingsRouter: container.settingsRouter,
    financeRouter: container.financeRouter,
    dashboardRouter: container.dashboardRouter,
    reportsRouter: container.reportsRouter,
    exportsRouter: container.exportsRouter,
  });
}

function main(): void {
  const httpServer = createServer();
  const realtime = createRealtimeServer(httpServer, new PrismaSessionsRepository());
  const container = buildContainer(realtime);
  const app = mountApp(container);
  httpServer.on('request', app);

  httpServer.listen(env.PORT, () => {
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
