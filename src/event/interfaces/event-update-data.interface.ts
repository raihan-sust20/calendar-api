import { UpdateRecurrenceType } from '../schemas/event.schema';

export interface IEventUpdateData {
  updateDate: Date;
  updateRecurrenceType: UpdateRecurrenceType;
  title?: string;
  description?: string;
  participants?: Array<string>;
  startTime?: Date;
  endTime?: Date;
}
