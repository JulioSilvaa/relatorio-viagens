import { env, isProduction } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { DevEmailProvider } from './dev.email-provider.js';
import type { EmailProvider } from './email-provider.js';

export function createEmailProvider(): EmailProvider {
  if (isProduction && env.EMAIL_PROVIDER === 'dev') {
    throw new AppError(
      500,
      'INVALID_EMAIL_PROVIDER',
      'Provedor de e-mail "dev" proibido em produção. Configure um provedor real.',
    );
  }
  return new DevEmailProvider();
}
