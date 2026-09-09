import { env, isTest } from './config/env.js';
import { logger } from './shared/logger.js';
import { createApp } from './app/app.js';
import { buildContainer, createHealthRouter } from './app/container.js';
import { prisma } from './config/database.js';

function main(): void {
  const container = buildContainer();
  const app = createApp({
    healthRouter: createHealthRouter(),
    authRouter: container.authRouter,
    usersRouter: container.usersRouter,
  });

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
