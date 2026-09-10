import { z } from 'zod';

export const updateSettingsSchema = z.object({
  kmReimbursementRate: z.coerce.number().positive('Taxa deve ser maior que zero').max(1000),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
