import { z } from 'zod';
import { DEPARTMENT_TYPES, ROLE_TYPES } from '../user.types.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(200),
  phone: z.string().trim().max(20).nullish(),
  department: z.enum(DEPARTMENT_TYPES),
  cargo: z.string().trim().min(1, 'Cargo é obrigatório').max(100),
  roleCode: z.enum(ROLE_TYPES),
  managerId: z.string().uuid().nullish(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
