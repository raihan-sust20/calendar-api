import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  newParticipants: Array<string>;

  @ApiPropertyOptional()
  pariticipantsToRemove: Array<string>;
}
