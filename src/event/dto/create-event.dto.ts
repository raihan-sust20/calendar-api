import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNotEmpty, IsString } from 'class-validator';
import { RecurrenceType } from '../schemas/event.schema';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  startTime: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  endTime: string;

  @ApiProperty()
  @IsNotEmpty()
  pariticipants: Array<string>;

  @ApiProperty({
    enum: [
      RecurrenceType.None,
      RecurrenceType.Daily,
      RecurrenceType.Weekly,
      RecurrenceType.Monthly,
    ],
  })
  @IsEnum(RecurrenceType)
  recurrence: RecurrenceType;
}
