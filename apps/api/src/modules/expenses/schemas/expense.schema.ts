import { z } from 'zod';

export const RECEIPT_TYPE_VALUES = [
  'NOTA_FISCAL',
  'CUPOM_FISCAL',
  'NOTA_MANUAL',
  'COMPROVANTE_CARTAO',
  'OUTRO',
] as const;

export const receiptTypeSchema = z.enum(RECEIPT_TYPE_VALUES);

const booleanish = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => {
  return typeof value === 'boolean' ? value : value === 'true';
});

export const createExpenseSchema = z.object({
  tripId: z.string().uuid('Viagem inválida'),
  categoryCode: z.string().trim().min(1, 'Categoria é obrigatória'),
  valor: z.coerce
    .number()
    .min(0, 'Valor deve ser maior que zero')
    .transform((value) => value.toFixed(2)),
  dataDespesa: z.coerce.date(),
  reembolsavel: booleanish,
  justificativa: z.string().trim().min(3, 'Justificativa é obrigatória'),
  tipoComprovante: receiptTypeSchema,
});

export const editExpenseSchema = z.object({
  categoryCode: z.string().trim().min(1).optional(),
  valor: z.coerce
    .number()
    .gt(0)
    .transform((value) => value.toFixed(2))
    .optional(),
  dataDespesa: z.coerce.date().optional(),
  reembolsavel: booleanish.optional(),
  justificativa: z.string().trim().min(3).optional(),
});

export const createCategorySchema = z.object({
  code: z.string().trim().toUpperCase().min(2),
  name: z.string().trim().min(2),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  ativa: z.boolean().optional(),
});

export const configureLimitSchema = z.object({
  valor: z.coerce
    .number()
    .gt(0)
    .transform((value) => value.toFixed(2)),
});

export const receiptUploadSchema = z.object({
  tipoComprovante: receiptTypeSchema.optional().default('OUTRO'),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type EditExpenseDto = z.infer<typeof editExpenseSchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ConfigureLimitDto = z.infer<typeof configureLimitSchema>;
