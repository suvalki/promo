import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createPaginatedSchema } from '@/common/dto/paginated.dto';

export const PromoStatSchema = z.object({
  id: z.string(),
  code: z.string(),
  discount: z.coerce.number(),
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
  globalLimit: z.coerce.number(),
  userLimit: z.coerce.number(),
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
  usageCount: z.coerce.number(),
});

export const PaginatedPromoStatSchema = createPaginatedSchema(PromoStatSchema);

export default class PaginatedPromoStatOutDto extends createZodDto(
  PaginatedPromoStatSchema,
) {}
