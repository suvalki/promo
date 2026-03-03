import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class ForgotPasswordDto extends createZodDto(
  z.object({
    email: z.email(),
  }),
) {}
