import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export default class CreatePromoDto extends createZodDto(
  z.object({
    code: z
      .string()
      .min(1, 'Код не может быть пустым')
      .describe('Уникальный код промокода'),
    discount: z
      .number()
      .positive('Скидка должна быть положительным числом')
      .describe('Размер скидки в процентах'),
    activeFrom: z
      .preprocess(
        (v) => (v === null || v === 0 || v === '0' ? null : v),
        z.coerce.date().nullish(),
      )
      .describe('Дата начала действия промокода'),
    expiredAt: z
      .preprocess(
        (v) => (v === null || v === 0 || v === '0' ? null : v),
        z.coerce.date().nullish(),
      )
      .describe('Дата окончания действия промокода'),
    globalLimit: z
      .number()
      .int('Лимит должен быть целым числом')
      .min(-1, 'Минимальное значение -1')
      .nullish()
      .describe('Общее количество использований промокода'),
    userLimit: z
      .number()
      .int('Лимит должен быть целым числом')
      .min(-1, 'Минимальное значение -1')
      .nullish()
      .describe('Количество использований промокода на одного пользователя'),
  }),
) {}
