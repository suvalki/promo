import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class ResetPasswordDto extends createZodDto(
  z.object({
    token: z.string(),
    password: z.string().min(6),
  }),
) {}
