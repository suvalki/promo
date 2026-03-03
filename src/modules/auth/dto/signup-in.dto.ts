import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export default class SignupDto extends createZodDto(
  z.object({
    name: z
      .string()
      .min(2, 'Имя должно быть не менее 2 символов')
      .describe('Полное имя пользователя'),
    email: z
      .email('Некорректный формат email')
      .describe('Электронная почта пользователя'),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Некорректный формат номера телефона')
      .describe('Международный номер телефона пользователя'),
    password: z
      .string()
      .min(6, 'Пароль должен быть не менее 6 символов')
      .describe('Пароль пользователя'),
  }),
) {}
