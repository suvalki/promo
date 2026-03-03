import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AnalyticsUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  createdAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime().nullish(),
  ),
  totalSpent: z.coerce.number(),
  totalOrders: z.coerce.number(),
});

export class AnalyticsUserOutDto extends createZodDto(AnalyticsUserSchema) {}
