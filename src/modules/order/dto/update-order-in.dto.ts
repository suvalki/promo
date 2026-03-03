import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class UpdateOrderInDto extends createZodDto(
  z.object({
    organicCost: z.number().positive(),
  }),
) {}
