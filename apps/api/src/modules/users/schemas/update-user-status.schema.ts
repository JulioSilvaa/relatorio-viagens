import { z } from 'zod';
import { USER_STATUS } from '../user.types.js';

export const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUS),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
