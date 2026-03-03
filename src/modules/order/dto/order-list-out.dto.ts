import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createPaginatedSchema } from '@/common/dto/paginated.dto';

export const OrderListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  userPhone: z.string(),
  organicCost: z.coerce.number(),
  totalCost: z.coerce.number(),
  promoId: z.string().nullable().optional(),
  promoCode: z.string().nullable().optional(),
  promoDiscount: z.coerce.number().nullable().optional(),
  createdAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime(),
  ),
  updatedAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime(),
  ),
});

export const PaginatedOrderListSchema =
  createPaginatedSchema(OrderListItemSchema);

export default class PaginatedOrderListOutDto extends createZodDto(
  PaginatedOrderListSchema,
) {}
