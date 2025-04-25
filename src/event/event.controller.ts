import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Headers,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiHeader, ApiParam } from '@nestjs/swagger';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @Headers('Authorizatoin') authorization: string,
  ) {
    return this.eventService.create(authorization, createEventDto);
  }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @ApiParam({
    name: 'endDate',
    required: true,
    description:
      'Last date to show event recurrences. Please use format: `dd-mm-yyyy`',
  })
  @Get('myevents')
  getEvents(@Headers('Authorizatoin') authorization: string) {
    return this.eventService.findAll();
  }

  // @ApiHeader({
  //   name: 'Authorizatoin',
  //   required: true,
  //   description: 'Please include `userId` here'
  // })
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.eventService.findOne(+id);
  // }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @Put(':eventId')
  update(
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
    @Headers('Authorizatoin') authorization: string,
  ) {
    return this.eventService.update(authorization, eventId, updateEventDto);
  }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @Delete(':eventId')
  remove(
    @Param('eventId') eventId: string,
    @Headers('Authorizatoin') authorization: string,
  ) {
    return this.eventService.remove(authorization, eventId);
  }
}
