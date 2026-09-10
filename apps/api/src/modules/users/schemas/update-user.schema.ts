import type { z } from 'zod';
import { createUserSchema } from './create-user.schema.js';

export const updateUserSchema = createUserSchema;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
