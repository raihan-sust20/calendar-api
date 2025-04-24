import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export enum UserRole {
  User = 'User',
  Admin = 'Admin',
}

@Schema()
export class User {
  @Prop()
  email: string;

  @Prop()
  passHash: string;

  @Prop()
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
