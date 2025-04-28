export enum UpdateRecurrenceType {
  ThisEvent = 'ThisEvent',
  ThisAndFollowing = 'ThisAndFollowing',
  AllEvents = 'AllEvents',
}

export interface IEventUpdateData {
  index: number;
  updatedAt: string;
  updateRecurrenceType: UpdateRecurrenceType;
  startTime: string;
  endTime: string;
  updateData: {
    title?: string;
    description?: string;
    newParticipants?: Array<string>;
    participantsToRemove?: Array<string>;
    newStartTime?: string;
    newEndTime?: string;
  };
}
