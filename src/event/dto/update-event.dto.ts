import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UpdateRecurrenceType } from '../interfaces/event-update-data.interface';


export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newStartTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newEndTime?: string;

  @ApiProperty({
    enum: [
      UpdateRecurrenceType.AllEvents,
      UpdateRecurrenceType.ThisAndFollowing,
      UpdateRecurrenceType.ThisEvent,
    ],
  })
  updateRecurrenceType: UpdateRecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  newParticipants: Array<string>;

  @ApiPropertyOptional()
  @IsOptional()
  participantsToRemove: Array<string>;
}
