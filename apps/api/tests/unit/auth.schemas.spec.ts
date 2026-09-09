import { describe, expect, it } from 'vitest';
import { createUserSchema } from '../../src/modules/users/schemas/create-user.schema.js';
import {
  loginSchema,
  acceptInviteSchema,
  resetPasswordSchema,
} from '../../src/modules/auth/auth.schemas.js';

describe('createUserSchema', () => {
  it('aceita payload válido', () => {
    const result = createUserSchema.parse({
      name: 'João Silva',
      email: '  JOAO@example.com ',
      department: 'TECNICO',
      cargo: 'Analista',
      roleCode: 'EMPLOYEE',
    });
    expect(result.email).toBe('joao@example.com');
  });

  it('rejeita e-mail inválido', () => {
    expect(() =>
      createUserSchema.parse({
        name: 'João',
        email: 'nao-e-email',
        department: 'COMERCIAL',
        cargo: 'Analista',
        roleCode: 'EMPLOYEE',
      }),
    ).toThrow();
  });

  it('rejeita departamento fora do domínio', () => {
    expect(() =>
      createUserSchema.parse({
        name: 'João',
        email: 'joao@example.com',
        department: 'RH',
        cargo: 'Analista',
        roleCode: 'EMPLOYEE',
      }),
    ).toThrow();
  });
});

describe('auth schemas', () => {
  it('loginSchema rejeita senha curta', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'curta' })).toThrow();
  });

  it('acceptInviteSchema valida token e senha', () => {
    expect(() => acceptInviteSchema.parse({ token: 't', password: '12345678' })).not.toThrow();
    expect(() => acceptInviteSchema.parse({ token: 't', password: '123' })).toThrow();
  });

  it('resetPasswordSchema valida senha', () => {
    expect(() => resetPasswordSchema.parse({ token: 't', password: '123' })).toThrow();
  });
});
