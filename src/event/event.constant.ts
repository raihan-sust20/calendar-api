import { RecurrenceType } from './schemas/event.schema';

export const recurrenceTypeToDay = {
  [RecurrenceType.Daily]: 1,
  [RecurrenceType.Weekly]: 7,
  [RecurrenceType.Monthly]: 30,
};
