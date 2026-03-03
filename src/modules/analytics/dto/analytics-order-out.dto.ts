import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createPaginatedSchema } from '@/common/dto/paginated.dto';

export const AnalyticsOrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  organicCost: z.coerce.number(),
  totalCost: z.coerce.number(),
  promoCode: z.string().nullish(),
  promoDiscount: z.coerce.number().nullish(),
  createdAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime(),
  ),
});

export const PaginatedAnalyticsOrderSchema =
  createPaginatedSchema(AnalyticsOrderSchema);

export default class PaginatedAnalyticsOrderOutDto extends createZodDto(
  PaginatedAnalyticsOrderSchema,
) {}
