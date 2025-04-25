import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { IEventUpdateData } from '../interfaces/event-update-data.interface';

export type EventDocument = HydratedDocument<Event>;

export enum RecurrenceType {
  None = 'None',
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

export enum UpdateRecurrenceType {
  ThisEvent = 'ThisEvent',
  ThisAndFollowing = 'ThisAndFollowing',
  AllEvents = 'AllEvents',
}

@Schema()
export class Event {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  participants: User[];

  // @Prop({ type: RecurrenceType })
  // recurrence: RecurrenceType;

  // @Prop({ type: Array<IEventUpdateData> })
  // updates: Array<IEventUpdateData>
  
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
