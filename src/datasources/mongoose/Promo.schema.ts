import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from './User.schema';

@Schema({ timestamps: true })
export class Promo {
  _id: Types.ObjectId;
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  discount: number;

  @Prop()
  activeFrom: Date;

  @Prop()
  expiredAt: Date;

  @Prop()
  globalLimit: number;

  @Prop()
  userLimit: number;

  @Prop()
  inactiveAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: User | Types.ObjectId;

  createdAt?: Date;

  updatedAt?: Date;
}

export const PromoSchema = SchemaFactory.createForClass(Promo);
