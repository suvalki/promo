import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class AuthOutDto extends createZodDto(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    phone: z.string(),
  }),
) {}
