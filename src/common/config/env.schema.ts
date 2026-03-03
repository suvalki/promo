import { z } from 'zod';

export default z.object({
  PORT: z.string().optional().default('3000'),
  SECRET: z.string().optional(),
  MONGODB_URL: z.string().optional(),
  CLICKHOUSE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
});
