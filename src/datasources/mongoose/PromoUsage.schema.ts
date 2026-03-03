import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Order } from './Order.schema';
import { Promo } from './Promo.schema';

@Schema({
  timestamps: true,
})
export class PromoUsage {
  _id: Types.ObjectId;
  @Prop({ required: true })
  promo: Promo;

  @Prop({ required: true })
  order: Order;

  @Prop({ required: true })
  cost: number;

  createdAt?: Date;

  updatedAt?: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);
