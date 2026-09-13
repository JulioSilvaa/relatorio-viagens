import 'dotenv/config';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const PLACEHOLDER_PATTERN = /^(replace-me|change-me|changeme|admin|1234)/i;

function rejectPlaceholder(label: string): (value: string, ctx: z.RefinementCtx) => void {
  return (value, ctx) => {
    if (isProduction && PLACEHOLDER_PATTERN.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} não pode usar o placeholder do .env.example.`,
      });
    }
  };
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL obrigatória'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET deve ter ao menos 16 caracteres')
    .superRefine(rejectPlaceholder('SESSION_SECRET')),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(480),
  INVITE_TOKEN_EXPIRES_HOURS: z.coerce.number().int().positive().default(72),
  PASSWORD_RESET_EXPIRES_HOURS: z.coerce.number().int().positive().default(1),

  CARD_ENCRYPTION_KEY: z
    .string()
    .min(16)
    .optional()
    .superRefine((value, ctx) => {
      if (value) {
        rejectPlaceholder('CARD_ENCRYPTION_KEY')(value, ctx);
      }
    }),
  OCR_PROVIDER: z.enum(['paddleocr', 'gemini', 'neutro']).default('paddleocr'),
  OCR_AUTO_ON_UPLOAD: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  OCR_PADDLE_URL: z.string().default('http://ocr:8000'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
}

if (isProduction && parsed.data.CARD_ENCRYPTION_KEY === undefined) {
  throw new Error(
    'Variáveis de ambiente inválidas:\n  - CARD_ENCRYPTION_KEY é obrigatória em produção.',
  );
}

export const env = parsed.data;

export const isTest = env.NODE_ENV === 'test';
export { isProduction };
