import { describe, expect, it } from 'vitest';
import { generateSecureToken, hashToken, safeEqual } from '../../src/shared/utils/crypto.js';

describe('crypto', () => {
  it('gera tokens únicos em hex', () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it('gera hash determinístico e irreversível', () => {
    const hash = hashToken('abc123');
    expect(hashToken('abc123')).toBe(hash);
    expect(hashToken('abc124')).not.toBe(hash);
  });

  it('safeEqual compara com segurança', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
