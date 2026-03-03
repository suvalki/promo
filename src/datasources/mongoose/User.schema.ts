import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: true,
})
export class User {
  _id: Types.ObjectId;
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  bannedAt: Date;

  createdAt?: Date;

  updatedAt?: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);
