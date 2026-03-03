import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from './User.schema';

@Schema({
  timestamps: true,
})
export class Order {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User | Types.ObjectId;

  @Prop({ required: true })
  organicCost: number;

  @Prop()
  inactiveAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
