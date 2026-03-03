import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ClickHouseQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
    sortBy: z.string().optional(),
    sortOrder: z
      .enum(['ASC', 'DESC', 'asc', 'desc'])
      .optional()
      .default('DESC'),
    dateFrom: z.iso.datetime().pipe(z.coerce.date()).optional().nullable(),
    dateTo: z.iso.datetime().pipe(z.coerce.date()).optional().nullable(),
    search: z.string().optional().nullable(),
  })
  .catchall(z.any());

export class ClickHouseQueryDto extends createZodDto(ClickHouseQuerySchema) {}
