import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class OrderOutDto extends createZodDto(
  z.object({
    id: z.string(),
    organicCost: z.number(),
    createdAt: z.preprocess(
      (v) => (v instanceof Date ? v.toISOString() : v),
      z.iso.datetime().nullish(),
    ),
    updatedAt: z.preprocess(
      (v) => (v instanceof Date ? v.toISOString() : v),
      z.iso.datetime().nullish(),
    ),
  }),
) {}
