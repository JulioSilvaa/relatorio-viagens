import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnv });

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST não definida — necessária para os testes de integração.');
}

process.env.DATABASE_URL = testDatabaseUrl;

export default async function globalSetup(): Promise<void> {
  const apiDir = path.resolve(__dirname, '../..');
  const schemaPath = path.resolve(__dirname, '../../../../prisma/schema.prisma');

  execSync(`npx prisma migrate deploy --schema ${schemaPath}`, {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  });
}
