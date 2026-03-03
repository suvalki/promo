import { createZodDto } from 'nestjs-zod';
import CreatePromoDto from './create-promo-in.dto';

const updateSchema = CreatePromoDto.schema.partial();

export default class UpdatePromoDto extends createZodDto(updateSchema) {}
