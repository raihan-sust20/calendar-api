import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { IEventUpdateData } from '../interfaces/event-update-data.interface';

export type EventDocument = HydratedDocument<Event>;

export enum RecurrenceType {
  // None = 'None',
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

@Schema()
export class Event {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  startTime: string;

  @Prop()
  endTime: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  participants: User[];

  @Prop()
  recurrence: string;

  @Prop({ type: Array<IEventUpdateData>, default: [] })
  updates: Array<IEventUpdateData>;

  @Prop()
  createdAt: string;

  @Prop()
  updatedAt: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
