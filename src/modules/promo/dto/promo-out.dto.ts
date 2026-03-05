import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class PromoOutDto extends createZodDto(
  z.object({
    id: z.string(),
    code: z.string(),
    discount: z.number(),
    activeFrom: z.iso
      .datetime()
      .pipe(z.coerce.date())
      .transform((d) => d.toISOString())
      .nullish(),
    expiredAt: z.iso
      .datetime()
      .pipe(z.coerce.date())
      .transform((d) => d.toISOString())
      .nullish(),
    globalLimit: z.number().nullish(),
    userLimit: z.number().nullish(),
    inactiveAt: z.iso
      .datetime()
      .pipe(z.coerce.date())
      .transform((d) => d.toISOString())
      .nullish(),
    createdAt: z.iso
      .datetime()
      .pipe(z.coerce.date())
      .transform((d) => d.toISOString())
      .nullish(),
    updatedAt: z.iso
      .datetime()
      .pipe(z.coerce.date())
      .transform((d) => d.toISOString())
      .nullish(),
  }),
) {}
