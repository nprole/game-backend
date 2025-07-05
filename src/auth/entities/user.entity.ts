import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  // Player progression and currency
  @Prop({ default: 1 })
  level: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 500 })
  gold: number;

  @Prop({ default: 50 })
  diamonds: number;

  @Prop({ default: 10 })
  rubies: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
