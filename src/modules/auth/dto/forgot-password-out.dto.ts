import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class ForgotPasswordOutDto extends createZodDto(
  z.object({
    message: z.string(),
    token: z.string().optional(),
  }),
) {}
