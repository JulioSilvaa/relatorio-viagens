import { z } from 'zod';
import { DEPARTMENT_TYPES } from '../users/user.types.js';
import { isValidCnpj, normalizeCnpj } from '../../shared/utils/cnpj.js';

const PASSWORD_MIN_LENGTH = 8;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(200),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
  department: z.enum(DEPARTMENT_TYPES).default('COMERCIAL'),
  cargo: z.string().trim().min(1, 'Cargo é obrigatório').max(100).default('Administrador'),
  companyName: z.string().trim().min(2, 'Nome da empresa deve ter ao menos 2 caracteres').max(200),
  cnpj: z
    .string()
    .trim()
    .transform((value) => normalizeCnpj(value))
    .refine((value) => isValidCnpj(value), 'CNPJ inválido'),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
