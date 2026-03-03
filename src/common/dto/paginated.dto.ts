import { z } from 'zod';

export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    page: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(10),
    totalCount: z.coerce.number().optional(),
    totalPages: z.coerce.number().optional(),
  });
}
