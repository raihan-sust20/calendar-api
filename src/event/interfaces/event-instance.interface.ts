export interface IEventInstance {
  index: number;
  title: string;
  description: string;
  createdBy: string;
  participants: Array<string>;
  startTime: string;
  endTime: string;
}
