import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/shared/utils/password.js';

describe('password', () => {
  it('gera hash e valida senha correta', async () => {
    const hash = await hashPassword('senha-segura-123');
    expect(hash).not.toContain('senha-segura-123');
    expect(await verifyPassword('senha-segura-123', hash)).toBe(true);
  });

  it('rejeita senha incorreta', async () => {
    const hash = await hashPassword('senha-segura-123');
    expect(await verifyPassword('senha-errada', hash)).toBe(false);
  });
});
