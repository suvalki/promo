import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createPaginatedSchema } from '@/common/dto/paginated.dto';

export const AnalyticsPromoSchema = z.object({
  id: z.string(),
  code: z.string(),
  usageCount: z.coerce.number(),
  totalDiscountSum: z.coerce.number(),
  avgTotalCost: z.coerce.number(),
  createdAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime().nullish(),
  ),
});

export const PaginatedAnalyticsPromoSchema =
  createPaginatedSchema(AnalyticsPromoSchema);

export default class PaginatedAnalyticsPromoOutDto extends createZodDto(
  PaginatedAnalyticsPromoSchema,
) {}
