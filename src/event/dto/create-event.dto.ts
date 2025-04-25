import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

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
}
