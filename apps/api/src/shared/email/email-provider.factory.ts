import { isProduction } from '../../config/env.js';
import { DevEmailProvider } from './dev.email-provider.js';
import type { EmailProvider } from './email-provider.js';

export function createEmailProvider(): EmailProvider {
  if (isProduction) {
    console.warn(
      '[email] Nenhum provedor de e-mail real configurado; usando modo log (mensagens não são entregues).',
    );
  }
  return new DevEmailProvider();
}
