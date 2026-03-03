import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class CreateOrderInDto extends createZodDto(
  z.object({
    organicCost: z
      .number()
      .positive()
      .describe('Original cost of the order before promo code'),
  }),
) {}
