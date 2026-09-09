import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
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
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
