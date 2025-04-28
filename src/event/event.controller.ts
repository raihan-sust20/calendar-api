import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Headers,
} from '@nestjs/common';
import * as RA from 'ramda-adjunct';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiHeader, ApiParam } from '@nestjs/swagger';
import { UpdateRecurrenceType } from './interfaces/event-update-data.interface';

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
    name: 'lastEventTime',
    required: true,
    description:
      'Last date-time to show event instance. Please use ISO8601 format.',
  })
  @Get('myevents/:lastEventTime')
  getEvents(
    @Headers('Authorizatoin') authorization: string,
    @Param('lastEventTime') lastEventTime: string,
  ) {
    return this.eventService.getEvents(
      { createdBy: authorization },
      lastEventTime,
    );
  }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @Get('event/raw/:eventId')
  findOne(@Param('eventId') eventId: string) {
    return this.eventService.getEvent({ _id: eventId });
  }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @ApiParam({
    name: 'eventId',
    required: true,
    description: 'Event id',
  })
  @ApiParam({
    name: 'instanceIndex',
    required: true,
    description: 'Event instance index',
  })
  @Put(':eventId/:instanceIndex')
  update(
    @Param('eventId') eventId: string,
    @Param('instanceIndex') eventInstanceIndexStr: string,
    @Body() updateEventDto: UpdateEventDto,
    @Headers('Authorizatoin') authorization: string,
  ) {
    const eventInstanceIndex = RA.toNumber(eventInstanceIndexStr);
    return this.eventService.update(
      authorization,
      eventId,
      eventInstanceIndex,
      updateEventDto,
    );
  }

  @ApiHeader({
    name: 'Authorizatoin',
    required: true,
    description: 'Please include `userId` here',
  })
  @ApiParam({
    name: 'eventId',
    required: true,
    description: 'Event id',
  })
  @ApiParam({
    name: 'instanceIndex',
    required: true,
    description: 'Event instance index',
  })
  @ApiParam({
    name: 'recurrenceType',
    required: true,
    enum: UpdateRecurrenceType,
    description: 'Event instance index',
  })
  @Delete(':eventId/:instanceIndex/:recurrenceType')
  remove(
    @Headers('Authorizatoin') authorization: string,
    @Param('eventId') eventId: string,
    @Param('instanceIndex') instanceIndexStr: string,
    @Param('recurrenceType') recurrenceType: UpdateRecurrenceType,
  ) {
    const instanceIndex = RA.toNumber(instanceIndexStr);
    return this.eventService.remove(
      authorization,
      eventId,
      instanceIndex,
      recurrenceType,
    );
  }
}
