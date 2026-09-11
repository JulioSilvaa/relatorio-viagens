import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST não definida no arquivo .env — necessária para os testes.');
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      OCR_AUTO_ON_UPLOAD: 'false',
      OCR_TIMEOUT_MS: '5000',
    },
  },
});
