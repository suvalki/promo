import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class ApplyPromoInDto extends createZodDto(
  z.object({
    code: z.string().min(1).describe('Promo code to apply'),
  }),
) {}
