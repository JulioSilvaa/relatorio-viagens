import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL obrigatória'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET deve ter ao menos 16 caracteres'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(480),
  INVITE_TOKEN_EXPIRES_HOURS: z.coerce.number().int().positive().default(72),
  PASSWORD_RESET_EXPIRES_HOURS: z.coerce.number().int().positive().default(1),
  EMAIL_PROVIDER: z.enum(['dev']).default('dev'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
}

export const env = parsed.data;

export const isTest = env.NODE_ENV === 'test';
export const isProduction = env.NODE_ENV === 'production';
