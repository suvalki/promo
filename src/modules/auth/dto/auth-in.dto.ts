import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class AuthInDto extends createZodDto(
  z.object({
    email: z.email().describe('User email address'),
    password: z.string().min(6).describe('User password'),
  }),
) {}
